import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Lock, Zap } from 'lucide-react';

interface FeatureLockedOverlayProps {
  featureName: string;
  requiredPlan?: string;
}

export default function FeatureLockedOverlay({ featureName, requiredPlan = 'Growth' }: FeatureLockedOverlayProps) {
  const { t } = useTranslation();

  return (
    <div className="relative rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-amber-800">{t(featureName)}</h3>
        <p className="mb-4 max-w-sm text-sm text-amber-700">
          {t('This feature requires the {{plan}} plan or higher.', { plan: requiredPlan })}
          <br />
          {t('Upgrade your plan to unlock this feature and more.')}
        </p>
        <Button
          onClick={() => router.visit(route('plan-orders.index'))}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Zap className="me-2 h-4 w-4" />
          {t('Upgrade Plan')}
        </Button>
      </div>
    </div>
  );
}
