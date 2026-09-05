import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Crown, Zap } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  limitType?: string;
  current?: number;
  max?: number;
  tiers?: { name: string; max_products: number }[];
}

export default function UpgradeModal({ open, onOpenChange, feature, limitType, current, max, tiers }: UpgradeModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Crown className="h-7 w-7 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            {t('Upgrade Your Plan')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {limitType === 'resource' && current !== undefined && max !== undefined ? (
              <span>
                {t('You have reached the limit of {{current}}/{{max}} for your current plan.', { current, max })}
                <br />
                {t('Upgrade to unlock more capacity and features.')}
              </span>
            ) : feature ? (
              <span>
                {t('The "{{feature}}" feature requires a higher plan.', { feature })}
                <br />
                {t('Upgrade to access this feature.')}
              </span>
            ) : (
              t('Upgrade your plan to unlock this feature and more.')
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          {tiers && tiers.length > 0 && tiers.map((tier) => (
            <div key={tier.name} className="rounded-lg border bg-emerald-50 p-3 text-sm">
              <div className="font-semibold text-emerald-700">{tier.name}</div>
              <div className="text-emerald-600">{tier.max_products} {t('products')}</div>
            </div>
          ))}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Maybe Later')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              router.visit(route('plan-orders.index'));
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Zap className="me-2 h-4 w-4" />
            {t('Upgrade Plan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
