import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTour } from './tour-context';

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export function TourOverlay() {
    const { t } = useTranslation();
    const { active, index, steps, next, back, stop } = useTour();
    const [rect, setRect] = useState<Rect | null>(null);
    const [centered, setCentered] = useState(false);

    useEffect(() => {
        if (!active) {
            setRect(null);
            setCentered(false);
            return;
        }

        const step = steps[index];
        if (!step) return;

        let cancelled = false;
        setRect(null);

        const hasTarget = Boolean(step.resolveTarget || step.selector);
        // Page-level steps show the card centered immediately; targeted steps
        // show it at the bottom right away and upgrade to a spotlight when found.
        setCentered(!hasTarget);

        if (!hasTarget) return;

        const locate = async () => {
            for (let attempt = 0; attempt < 40; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                if (cancelled) return;

                const el = step.resolveTarget
                    ? step.resolveTarget()
                    : step.selector
                      ? document.querySelector(step.selector)
                      : null;
                if (el) {
                    (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
                    await new Promise((resolve) => setTimeout(resolve, 250));
                    if (cancelled) return;
                    const bounds = (el as HTMLElement).getBoundingClientRect();
                    setRect({ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height });
                    setCentered(false);
                    return;
                }
            }

            // Element never matched — fall back to a centered card.
            if (!cancelled) setCentered(true);
        };

        locate();
        return () => {
            cancelled = true;
        };
    }, [active, index, steps]);

    if (!active || !steps[index]) return null;

    const step = steps[index];
    const isLast = index === steps.length - 1;
    const dismissLabel = isLast ? t('Finish') : t('Skip');

    return (
        <div className="fixed inset-0 z-[90]">
            <div className="absolute inset-0" onClick={stop} />
            {rect && (
                <div
                    className="pointer-events-none absolute z-[91] rounded-lg border-2 border-primary"
                    style={{
                        top: rect.top - 6,
                        left: rect.left - 6,
                        width: rect.width + 12,
                        height: rect.height + 12,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                    }}
                />
            )}
            <div
                className={
                    centered
                        ? 'absolute z-[92] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                        : 'absolute z-[92] left-1/2 bottom-6 -translate-x-1/2'
                }
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-4 shadow-2xl">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t('Step {{current}} of {{total}}', { current: index + 1, total: steps.length })}
                        </span>
                        <button
                            type="button"
                            onClick={stop}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={t('Close')}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold">{t(step.titleKey)}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">{t(step.descKey)}</p>
                    <div className="flex items-center justify-between gap-2">
                        <Button size="sm" variant="outline" onClick={back} disabled={index === 0}>
                            {t('Previous')}
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={stop}>
                                {dismissLabel}
                            </Button>
                            <Button size="sm" onClick={next}>
                                {isLast ? t('Finish') : t('Next')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
