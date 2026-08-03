import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, CreditCard, Circle, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';

interface Plan {
  id: number;
  name: string;
  price: string;
  yearly_price?: string;
  monthly_price?: string;
  duration: string;
  description?: string;
  features?: string[];
  is_active?: boolean;
  is_current?: boolean;
}

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (planId: number, billingCycle: 'monthly' | 'yearly') => void;
  plans: Plan[];
  currentPlanId?: number;
  companyCurrentPlanDuration?: string;
  companyName: string;
}

export function UpgradePlanModal({
  isOpen,
  onClose,
  onConfirm,
  plans,
  currentPlanId,
  companyCurrentPlanDuration,
  companyName
}: UpgradePlanModalProps) {
  const { t } = useTranslation();
  const page = usePage<any>();
  const auth = page.props?.auth;
  // Per-tab independent selections: each billing cycle remembers its own selection
  const [selectedByTab, setSelectedByTab] = useState<{ monthly: number | null; yearly: number | null }>({ monthly: null, yearly: null });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Derived: currently selected plan for the active tab
  const selectedPlanId = selectedByTab[billingCycle];

  // Set selection only for the currently active tab
  const setSelectedPlanId = (id: number | null) => {
    setSelectedByTab(prev => ({ ...prev, [billingCycle]: id }));
  };

  // Initialize per-tab selections and billing cycle when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (!plans || plans.length === 0) return;

    // Detect correct billing cycle for company's current plan
    const companyDuration = (companyCurrentPlanDuration || 'monthly').toLowerCase();
    const detectedCycle: 'monthly' | 'yearly' = companyDuration === 'yearly' ? 'yearly' : 'monthly';
    setBillingCycle(detectedCycle);

    // Find the current plan and pre-select it on its matching tab only
    const currentPlan = plans.find(plan => plan.is_current === true);
    if (currentPlan) {
      setSelectedByTab({
        monthly: detectedCycle === 'monthly' ? currentPlan.id : null,
        yearly: detectedCycle === 'yearly' ? currentPlan.id : null
      });
    } else {
      setSelectedByTab({ monthly: null, yearly: null });
    }
  }, [isOpen, plans, currentPlanId, companyCurrentPlanDuration]);
  
  const handleConfirm = () => {
    if (selectedPlanId) {
      onConfirm(selectedPlanId, billingCycle);
    }
  };
  
  // Helper function to format currency
  const formatCurrency = (amount: number | string): string => {
    const num = Number(amount) || 0;
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  const getPriceForSelectedCycle = (plan: Plan) => {
    const priceValue = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
    // Extract numeric value from formatted price (e.g., "$99.99" -> 99.99)
    const numericPrice = parseFloat(priceValue?.replace(/[^0-9.-]+/g, '') || '0');
    return isNaN(numericPrice) ? priceValue : formatCurrency(numericPrice);
  };
  
  const getDurationLabel = () => {
    return billingCycle === 'yearly' ? t('Yearly') : t('Monthly');
  };

  // Only highlight as "current" if the tab matches the company's actual plan duration
  const isPlanCurrentForTab = (plan: Plan) => {
    if (!plan.is_current) return false;
    // Use ONLY the company's duration from props (not plan.duration fallback)
    const companyDuration = (companyCurrentPlanDuration || 'monthly').toLowerCase();
    // For trial/lifetime/free: show active on any tab
    if (['trial', 'lifetime', 'free'].includes(companyDuration)) return true;
    return companyDuration === billingCycle;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("Upgrade Plan for")} {companyName}</DialogTitle>
          <DialogDescription>
            {t("Select a new plan for this company")}
          </DialogDescription>
        </DialogHeader>
        
        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-3 py-4 border-b">
          <Label className="text-sm font-medium">{t('Monthly')}</Label>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <Label className="text-sm font-medium">{t('Yearly')}</Label>
        </div>
        
        <div className="py-4 flex-1 overflow-y-auto -mx-6 px-6">
          <RadioGroup 
            value={selectedPlanId?.toString() || ""} 
            onValueChange={(value) => setSelectedPlanId(parseInt(value))}
            className="space-y-4"
          >
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex items-center space-x-3 rounded-lg border p-4 ${selectedPlanId === plan.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                    } ${isPlanCurrentForTab(plan) ? 'bg-blue-50' : ''}`}
                >
                  <div className="relative">
                    <RadioGroupItem 
                      value={plan.id.toString()} 
                      id={`plan-${plan.id}`} 
                      className="h-5 w-5"
                    />
                    {selectedPlanId === plan.id && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                      </div>
                    )}
                  </div>
                  <Label
                    htmlFor={`plan-${plan.id}`}
                    className="flex flex-1 cursor-pointer items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <p className="text-base font-medium">{plan.name}</p>
                        {isPlanCurrentForTab(plan) && (
                          <Badge variant="outline" className="ms-2 bg-blue-100 text-blue-800 border-blue-200">
                            {t("Current")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="me-1.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {getPriceForSelectedCycle(plan)} / {getDurationLabel().toLowerCase()}
                        </p>
                        {billingCycle === 'yearly' && (
                          <Badge variant="secondary" className="ms-2 text-xs bg-orange-100 text-orange-800">
                            {t('Best Value')}
                          </Badge>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      )}
                      {plan.features && plan.features.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {plan.features.map((feature, index) => (
                            <div key={index} className="flex items-center text-xs text-muted-foreground">
                              <CheckCircle2 className="me-1 h-3 w-3 text-green-500" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlanId || isPlanCurrentForTab(plans.find(p => p.id === selectedPlanId) as Plan)}
          >
            {t("Upgrade Plan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}