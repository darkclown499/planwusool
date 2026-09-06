import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Lock, Zap } from 'lucide-react';

interface FeatureLockedOverlayProps {
  featureName: string;
  requiredPlan?: string;
}

// P2E-01: a single, truthful plan-locked state. `requiredPlan` is only shown
// when callers can vouch for the minimum tier. When omitted the message stays
// generic ("not available in your current plan") so we never claim a specific
// plan unlocks a feature unless that claim is backed by the plan matrix.
export default function FeatureLockedOverlay({ featureName, requiredPlan }: FeatureLockedOverlayProps) {
  const { t } = useTranslation();

  const planLabel = (plan: string) => {
    const labels: Record<string, string> = {
      Starter: t('Starter'),
      Growth: t('Growth'),
      Professional: t('Professional'),
    };
    return labels[plan] || plan;
  };

  return (
    <div className="relative rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-6 sm:p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-amber-800">{t(featureName)}</h3>
        <p className="mb-4 max-w-sm text-sm text-amber-700">
          {requiredPlan
            ? t('This feature requires the {{plan}} plan or higher.', { plan: planLabel(requiredPlan) })
            : t('This feature is not available in your current plan.')}
          <br />
          {t('Upgrade your plan to unlock this feature and more.')}
        </p>
        <Button
          onClick={() => router.visit(route('plans.index'))}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Zap className="me-2 h-4 w-4" />
          {t('Upgrade Plan')}
        </Button>
      </div>
    </div>
  );
}