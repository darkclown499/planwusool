import React from 'react';
import { useTemplateAccess } from '@/templates/useTemplateAccess';

interface PlanGuardProps {
  templateSlug?: string;
  userPlanName?: string | null;
  userPlanTier?: 'starter' | 'growth' | 'professional' | null;
  isSuperAdmin?: boolean;
  isPreview?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PlanGuard - restricts content rendering based on plan access.
 * Shows fallback (default: UpgradePrompt) if the user's plan
 * does not allow access to the template.
 */
export const PlanGuard: React.FC<PlanGuardProps> = ({
  templateSlug,
  userPlanName,
  userPlanTier,
  isSuperAdmin = false,
  isPreview = false,
  fallback,
  children,
}) => {
  const { canActivate } = useTemplateAccess({
    templateSlug,
    userPlanName,
    userPlanTier,
    isSuperAdmin,
    isPreview,
  });

  if (!canActivate) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <UpgradePrompt
        templateSlug={templateSlug}
        userPlanName={userPlanName}
        userPlanTier={userPlanTier}
      />
    );
  }

  return <>{children}</>;
};

interface UpgradePromptProps {
  templateSlug?: string;
  templateName?: string;
  requiredPlan?: string;
  userPlanName?: string | null;
  userPlanTier?: 'starter' | 'growth' | 'professional' | null;
  demoStoreUrl?: string;
  className?: string;
}

/**
 * UpgradePrompt - displayed when a user tries to use a
 * template that requires a higher plan.
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  templateSlug,
  templateName,
  requiredPlan,
  userPlanName,
  userPlanTier,
  demoStoreUrl = '',
  className = '',
}) => {
  const { template, planTier } = useTemplateAccess({
    templateSlug,
    userPlanName,
    userPlanTier,
  });

  const displayName = templateName || template?.name || templateSlug;
  const displayRequired = requiredPlan || template?.plan_required || 'professional';

  // Preview links to the demo store with this template applied
  const previewUrl = demoStoreUrl
    ? `${demoStoreUrl}?theme=${encodeURIComponent(templateSlug || 'basic')}&preview=1`
    : `/demo?template=${encodeURIComponent(templateSlug || '')}`;

  const planLabels: Record<string, string> = {
    starter: 'باقة البداية',
    growth: 'باقة النمو',
    professional: 'باقة الاحتراف',
  };

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center ${className}`}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <LockIcon className="h-7 w-7 text-amber-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">قالب «{displayName}» يتطلب ترقية الباقة</h3>
      <p className="mt-2 text-sm text-gray-600">
        هذا القالب متاح في <span className="font-semibold">{planLabels[displayRequired] || displayRequired}</span> أو أعلى.
        باقتك الحالية: <span className="font-semibold">{planLabels[planTier] || planTier}</span>
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href="/plans"
          className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-amber-700"
        >
          ترقية الباقة الآن
        </a>
        <a
          href={previewUrl}
          className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          معاينة القالب
        </a>
      </div>
    </div>
  );
};

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export default PlanGuard;