<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Reporting-period resolution for Analytics & Reporting.
 *
 * A single timezone-aware place that decides what "today", "yesterday",
 * "last 7 days", … mean for a store. All day boundaries are computed in the
 * STORE's configured timezone (default: Asia/Hebron) and converted to UTC
 * instants for database filters, because order timestamps are stored in UTC.
 *
 *   - owns the preset → range mapping and custom-range validation,
 *   - exposes the immediately previous, equal-length period for comparison,
 *   - produces backend bucket intervals (hour/day/week) with exact
 *     store-local boundaries for trend aggregation.
 *
 * Requested ranges are validated server-side (never trust the client): a
 * custom range is capped at MAX_CUSTOM_WINDOW_DAYS and inverted ranges are
 * rejected with an explicit validation error.
 */
final class AnalyticsPeriod
{
    public const PRESETS = [
        'today', 'yesterday', 'last_7_days', 'last_30_days',
        'this_month', 'last_month', 'custom',
    ];

    public const CUSTOM_PRESET = 'custom';

    /** Hard cap for a custom reporting window. */
    public const MAX_CUSTOM_WINDOW_DAYS = 366;

    public const GRANULARITY_HOUR = 'hour';
    public const GRANULARITY_DAY = 'day';
    public const GRANULARITY_WEEK = 'week';

    private CarbonImmutable $now;

    private string $timezone;

    public function __construct(?string $timezone = null, ?\DateTimeInterface $now = null)
    {
        $this->timezone = $timezone ?: 'Asia/Hebron';
        $this->now = CarbonImmutable::parse($now ?: 'now')->setTimezone($this->timezone);
    }

    public function timezone(): string
    {
        return $this->timezone;
    }

    /**
     * Resolve a request into an exact (inclusive-from / exclusive-to) UTC range.
     *
     * Returned keys:
     *   key           preset key actually used ('custom' if input was custom)
     *   timezone      store timezone the boundaries were computed in
     *   from          Carbon UTC instant — first local day 00:00:00 (inclusive)
     *   to            Carbon UTC instant — day after the last local day 00:00:00 (exclusive)
     *   prev_from     Carbon UTC instant — start of the previous equivalent period
     *   prev_to       Carbon UTC instant — end of the previous equivalent period (exclusive)
     *   labels        human-readable from/to labels in the store timezone
     *
     * @param  string  $preset
     * @param  string|null  $from   Y-m-d (custom range, store-local dates)
     * @param  string|null  $to     Y-m-d (custom range, store-local dates)
     * @return array<string,mixed>
     *
     * @throws InvalidArgumentException when the custom range is malformed / too wide
     */
    public function resolve(string $preset = 'last_30_days', ?string $from = null, ?string $to = null): array
    {
        $preset = $preset !== '' ? strtolower($preset) : 'last_30_days';

        if (! in_array($preset, self::PRESETS, true)) {
            $preset = 'last_30_days';
        }

        if ($preset === self::CUSTOM_PRESET) {
            return $this->resolveCustom($from, $to);
        }

        $localNow = $this->now;
        $start = $this->startOfLocalDay($this->startForPreset($preset, $localNow), $preset);

        [$from, $to, $prevFrom, $prevTo] = $this->spanFor($start, $preset);

        return $this->payload($preset, $from, $to, $prevFrom, $prevTo);
    }

    /**
     * Bucket intervals (UTC, start-inclusive/end-exclusive) for trend aggregation.
     *
     * @return list<array{label:string,start:Carbon,end:Carbon}>
     */
    public function buckets(CarbonInterface $from, CarbonInterface $to, string $granularity): array
    {
        if ($granularity === self::GRANULARITY_HOUR) {
            return $this->hourlyBuckets($from, $to);
        }
        if ($granularity === self::GRANULARITY_WEEK) {
            return $this->weeklyBuckets($from, $to);
        }

        return $this->dailyBuckets($from, $to);
    }

    /**
     * Pick a sensible granularity for a window length (day count).
     */
    public function granularityFor(string $preset, CarbonInterface $from, CarbonInterface $to): string
    {
        if ($preset === 'today') {
            return self::GRANULARITY_HOUR;
        }
        if ($preset === 'yesterday') {
            return self::GRANULARITY_HOUR;
        }

        $windowDays = (int) $from->copy()->setTimezone($this->timezone)
            ->diffInDays($to->copy()->setTimezone($this->timezone), true);

        if ($windowDays <= 2 && $preset === 'custom') {
            return self::GRANULARITY_HOUR;
        }

        if ($windowDays > 120) {
            return self::GRANULARITY_WEEK;
        }

        return self::GRANULARITY_DAY;
    }

    /**
     * Relative change % with safe handling of a zero previous period.
     *
     * @return array{change:float|null,is_new:bool}
     */
    public static function change(?float $current, ?float $previous): array
    {
        $current = (float) ($current ?? 0);
        $previous = (float) ($previous ?? 0);

        if ($previous == 0) {
            return ['change' => null, 'is_new' => $current > 0];
        }

        return ['change' => round((($current - $previous) / $previous) * 100, 1), 'is_new' => false];
    }

    /* ------------------------------------------------------------------ */

    private function startForPreset(string $preset, CarbonImmutable $localNow): CarbonImmutable
    {
        return match ($preset) {
            'today' => $localNow,
            'yesterday' => $localNow->subDay(),
            'last_7_days' => $localNow->subDays(6),
            'last_30_days' => $localNow->subDays(29),
            'this_month' => $localNow->startOfMonth(),
            'last_month' => $localNow->subMonth()->startOfMonth(),
            default => $localNow->subDays(29),
        };
    }

    /**
     * @return array{Carbon,Carbon,Carbon,Carbon} from,to,prevFrom,prevTo — UTC instants
     */
    private function spanFor(CarbonImmutable $start, string $preset): array
    {
        $startLocal = $start;

        if ($preset === 'last_7_days' || $preset === 'last_30_days') {
            $from = $startLocal->startOfDay();
            $to = $this->now->addDay()->startOfDay();
            $length = $from->diffInDays($to->copy()->setTimezone($this->timezone));
            $prevTo = $from;
            $prevFrom = $from->subDays($length);
        } elseif ($preset === 'this_month') {
            $from = $startLocal->startOfMonth();
            $to = $from->addMonth()->startOfMonth();
            $prevTo = $from;
            $prevFrom = $from->subMonth()->startOfMonth();
        } elseif ($preset === 'last_month') {
            $from = $startLocal->startOfMonth();
            $to = $from->addMonth()->startOfMonth();
            $prevTo = $from;
            $prevFrom = $from->subMonth()->startOfMonth();
        } else {
            // today / yesterday — single local day
            $from = $startLocal->startOfDay();
            $to = $from->addDay();
            $prevTo = $from;
            $prevFrom = $from->subDay();
        }

        return [$from->toImmutable(), $to->toImmutable(), $prevFrom->toImmutable(), $prevTo->toImmutable()];
    }

    /**
     * @return array<string,mixed>
     */
    private function resolveCustom(?string $from, ?string $to): array
    {
        if (! $from || ! $to) {
            throw new InvalidArgumentException('Custom ranges require both a start and an end date.');
        }

        $start = $this->parseLocalDate($from);
        $end = $this->parseLocalDate($to);

        if ($start->greaterThan($end)) {
            throw new InvalidArgumentException('The reporting start date must be on or before the end date.');
        }

        $windowDays = (int) $start->diffInDays($end) + 1;
        if ($windowDays > self::MAX_CUSTOM_WINDOW_DAYS) {
            throw new InvalidArgumentException(
                'Custom reporting windows are limited to ' . self::MAX_CUSTOM_WINDOW_DAYS . ' days.'
            );
        }

        $from = $start->startOfDay();
        $to = $end->addDay()->startOfDay();

        $lengthDays = (int) $from->diffInDays($to->copy()->subDay()->startOfDay()) + 1;
        $prevTo = $from;
        $prevFrom = $from->subDays($lengthDays);

        return $this->payload(self::CUSTOM_PRESET, $from, $to, $prevFrom, $prevTo);
    }

    private function parseLocalDate(string $value): CarbonImmutable
    {
        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', trim($value), $this->timezone);
        } catch (\Throwable) {
            $date = false;
        }

        if (! $date || $date->format('Y-m-d') !== trim($value)) {
            throw new InvalidArgumentException('Dates must use the Y-m-d format.');
        }

        return $date;
    }

    private function startOfLocalDay(CarbonImmutable $value, string $preset): CarbonImmutable
    {
        return $value->startOfDay()->setTimezone($this->timezone);
    }

    /**
     * @return array<string,mixed>
     */
    private function payload(string $key, CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $prevFrom, CarbonImmutable $prevTo): array
    {
        return [
            'key' => $key,
            'timezone' => $this->timezone,
            'from' => $from->utc(),
            'to' => $to->utc(),
            'prev_from' => $prevFrom->utc(),
            'prev_to' => $prevTo->utc(),
            'labels' => [
                'from' => $from->setTimezone($this->timezone)->format('Y-m-d'),
                'to' => $to->copy()->subSecond()->setTimezone($this->timezone)->format('Y-m-d'),
                'timezone' => $this->timezone,
            ],
        ];
    }

    /**
     * @return list<array{label:string,start:Carbon,end:Carbon}>
     */
    private function hourlyBuckets(CarbonInterface $from, CarbonInterface $to): array
    {
        $buckets = [];
        $cursor = $from->copy()->setTimezone($this->timezone)->startOfHour();
        $end = $to->copy()->setTimezone($this->timezone);

        while ($cursor->lessThan($end)) {
            $next = $cursor->copy()->addHour();
            $buckets[] = [
                'label' => $cursor->format('H:00'),
                'start' => $cursor->utc(),
                'end' => $next->utc(),
            ];
            $cursor = $next;
        }

        return $buckets;
    }

    /**
     * @return list<array{label:string,start:Carbon,end:Carbon}>
     */
    private function dailyBuckets(CarbonInterface $from, CarbonInterface $to): array
    {
        $buckets = [];
        $cursor = $from->copy()->setTimezone($this->timezone)->startOfDay();
        $end = $to->copy()->setTimezone($this->timezone)->startOfDay();

        while ($cursor->lessThan($end)) {
            $next = $cursor->copy()->addDay();
            $buckets[] = [
                'label' => $cursor->format('M j'),
                'start' => $cursor->utc(),
                'end' => $next->utc(),
            ];
            $cursor = $next;
        }

        return $buckets;
    }

    /**
     * @return list<array{label:string,start:Carbon,end:Carbon}>
     */
    private function weeklyBuckets(CarbonInterface $from, CarbonInterface $to): array
    {
        $buckets = [];
        $cursor = $from->copy()->setTimezone($this->timezone)->startOfDay();
        $end = $to->copy()->setTimezone($this->timezone)->startOfDay();

        while ($cursor->lessThan($end)) {
            $next = $cursor->copy()->addDays(7);
            if ($next->greaterThan($end)) {
                $next = $end->copy();
            }
            $buckets[] = [
                'label' => $cursor->format('M j') . ' – ' . $next->copy()->subDay()->format('M j'),
                'start' => $cursor->utc(),
                'end' => $next->utc(),
            ];
            $cursor = $next;
        }

        return $buckets;
    }
}