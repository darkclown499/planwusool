<?php

namespace App\Services;

use App\Models\CodPayment;
use App\Models\CodSettlement;
use App\Models\CodSettlementItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * COD settlement batches — the courier's collected COD money, reconciled in one shot.
 *
 * createDraft(): packages a set of PENDING (fully uncollected) COD payments into a draft
 * batch with gross/fees/adjustment/net totals. A COD payment can belong to at most ONE
 * batch ever (unique cod_payment_id at the DB level).
 *
 * settle(): atomically marks every included payment as collected via the canonical
 * CodPaymentService (which also flips the owning orders to paid) and finalizes the batch.
 * Idempotent — a settled batch cannot settle again, and any item that is no longer
 * pending rolls the whole settlement back.
 *
 * MVP scope: only FULL pending COD payments (amount_remaining = total) are eligible.
 * Partially collected COD payments are excluded and must be finalized individually.
 */
class CodSettlementService
{
    public function createDraft(int $storeId, array $codPaymentIds, array $opts = []): CodSettlement
    {
        return DB::transaction(function () use ($storeId, $codPaymentIds, $opts) {
            $ids = array_values(array_unique(array_map('intval', $codPaymentIds)));
            if (empty($ids)) {
                throw new \Exception('يجب اختيار طلب واحد على الأقل');
            }

            $payments = CodPayment::where('store_id', $storeId)
                ->whereIn('id', $ids)
                ->get()
                ->keyBy('id');

            if ($payments->count() !== count($ids)) {
                throw new \Exception('أحد الطلبات المختارة غير موجود في متجرك');
            }

            foreach ($ids as $id) {
                $cp = $payments->get($id);
                if ($cp->status !== 'pending') {
                    throw new \Exception('الطلب #' . ($cp->order?->order_number ?? $id) . ' لم يعد بانتظار التحصيل');
                }
            }

            // DB unique(cod_payment_id) is the backstop; explicit check gives a friendly message.
            $already = CodSettlementItem::whereIn('cod_payment_id', $ids)->whereHas('settlement')->exists();
            if ($already) {
                throw new \Exception('أحد الطلبات المختارة مدرج بالفعل في دفعة تحصيل سابقة');
            }

            $gross = round($payments->sum(fn ($cp) => (float) $cp->amount_remaining), 2);
            $fees = round((float) ($opts['courier_fees'] ?? 0), 2);
            $adjustment = round((float) ($opts['adjustment'] ?? 0), 2);
            $net = round($gross + $adjustment - $fees, 2);
            if ($net < 0) {
                throw new \Exception('صافي الدفعة لا يمكن أن يكون سالباً — تحقق من الرسوم والتعديلات');
            }

            $settlement = CodSettlement::create([
                'store_id' => $storeId,
                'reference' => CodSettlement::generateReference(),
                'period_start' => $opts['period_start'] ?? null,
                'period_end' => $opts['period_end'] ?? null,
                'courier_company' => $opts['courier_company'] ?? null,
                'gross_amount' => $gross,
                'courier_fees' => $fees,
                'adjustment' => $adjustment,
                'net_amount' => $net,
                'status' => CodSettlement::STATUS_DRAFT,
                'notes' => $opts['notes'] ?? null,
            ]);

            foreach ($ids as $id) {
                $cp = $payments->get($id);
                CodSettlementItem::create([
                    'settlement_id' => $settlement->id,
                    'cod_payment_id' => $cp->id,
                    'order_id' => $cp->order_id,
                    'amount' => round((float) $cp->amount_remaining, 2),
                ]);
            }

            return $settlement->fresh(['items.codPayment.order']);
        });
    }

    /**
     * Finalize a draft settlement. Atomic + idempotent.
     *
     * @throws \Exception with Arabic domain message; transaction rolls back on any failure.
     */
    public function settle(CodSettlement $settlement): CodSettlement
    {
        return DB::transaction(function () use ($settlement) {
            $locked = CodSettlement::where('id', $settlement->id)->lockForUpdate()->first();
            if (!$locked) {
                throw new \Exception('الدفعة غير موجودة');
            }
            if ($locked->status === CodSettlement::STATUS_SETTLED) {
                throw new \Exception('تمت تسوية هذه الدفعة مسبقاً');
            }

            $items = CodSettlementItem::where('settlement_id', $locked->id)
                ->with(['codPayment.order', 'order'])
                ->lockForUpdate()
                ->get();

            if ($items->isEmpty()) {
                throw new \Exception('الدفعة لا تحتوي على أي طلبات');
            }

            // Validate eligibility of every item under lock FIRST — any invalid item aborts all.
            foreach ($items as $item) {
                $cp = $item->codPayment;
                if (!$cp) {
                    throw new \Exception('أحد طلبات الدفعة لم يعد موجوداً — أعد إنشاء الدفعة');
                }
                if ($cp->status !== 'pending') {
                    throw new \Exception('الطلب ' . ($item->order?->order_number ?? '') . ' لم يعد بانتظار التحصيل — أعد إنشاء الدفعة');
                }
                if ($cp->store_id !== $locked->store_id) {
                    throw new \Exception('أحد طلبات الدفعة يخص متجراً آخر — أعد إنشاء الدفعة');
                }
            }

            $codService = app(CodPaymentService::class);

            // Collect every item; recordCollection is idempotent-guarded and also unifies
            // the order-level payment state (orders become paid).
            foreach ($items as $item) {
                $cp = $item->codPayment;
                $codService->recordCollection($cp, (float) $cp->amount_remaining, [
                    'payment_method' => 'other',
                    'collected_by_name' => 'Settlement ' . $locked->reference,
                    'collected_by_user_id' => auth()->id(),
                    'reference' => 'Settlement ' . $locked->reference,
                    'notes' => 'تسوية تحصيل COD — ' . $locked->reference,
                ]);
            }

            $locked->update([
                'status' => CodSettlement::STATUS_SETTLED,
                'settled_at' => now(),
                'confirmed_by' => auth()->id() ?? $locked->confirmed_by,
                'notes' => $locked->notes,
            ]);

            return $locked->fresh(['items.codPayment.order']);
        });
    }

    public function deleteDraft(CodSettlement $settlement): void
    {
        DB::transaction(function () use ($settlement) {
            $locked = CodSettlement::where('id', $settlement->id)->lockForUpdate()->first();
            if (!$locked) {
                return;
            }
            if ($locked->status === CodSettlement::STATUS_SETTLED) {
                throw new \Exception('لا يمكن حذف دفعة تمت تسويتها');
            }
            CodSettlementItem::where('settlement_id', $locked->id)->delete();
            $locked->delete();
        });
    }
}