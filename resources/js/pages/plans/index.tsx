import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { router, usePage } from '@inertiajs/react';
import {
  CheckCircle2,
  X,
  Pencil,
  Trash2,
  Globe,
  FileText,
  Bot,
  BarChart2,
  Mail,
  Box,
  Store,
  Users,
  HardDrive,
  Plus,
  Sparkles,
  Info,
  Crown,
  Zap,
  Clock,
  Banknote,
  CreditCard,
  IndianRupee,
  Wallet,
  Coins
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { PlanSubscriptionModal } from '@/components/plan-subscription-modal';
import { hasPermission, checkPermissionWithAuth } from '@/utils/permissions';
import { formatSubscriptionPrice } from '@/utils/currency-helper';

interface Plan {
  id: number;
  name: string;
  price: string | number;
  formatted_price?: string;
  duration: string;
  description: string;
  trial_days: number;
  features: string[];
  stats: {
    businesses?: number | string;
    users?: number | string;
    stores?: number | string;
    users_per_store?: number | string;
    products_per_store?: number | string;
    storage: string;
    templates: number | string;
    warehouses?: number | string;
  };
  status: boolean;
  recommended?: boolean;
  is_free?: boolean;
  paymentMethods?: any;
  is_default?: boolean;
  is_current?: boolean;
  is_trial_available?: boolean;
}

interface Props {
  plans: Plan[];
  billingCycle: 'monthly' | 'yearly';
  hasDefaultPlan?: boolean;
  isAdmin?: boolean;
  currentPlan?: any;
  userTrialUsed?: boolean;
  paymentMethods?: any[];
}

export default function Plans({ plans: initialPlans, billingCycle: initialBillingCycle = 'yearly', hasDefaultPlan, isAdmin = false, currentPlan, userTrialUsed, paymentMethods = [] }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [billingCycle] = useState<'yearly'>('yearly');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [submittingPlan, setSubmittingPlan] = useState<number | null>(null);



  // Update plans when initialPlans changes
  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  // Company plan actions
  const handlePlanRequest = (planId: number) => {
    if (!checkPermissionWithAuth('request-plans', auth)) {
      toast.error(t('You do not have permission to request plans'));
      return;
    }
    setSubmittingPlan(planId);
    router.post(route('plans.request'), {
      plan_id: planId,
      billing_cycle: billingCycle
    }, {
      onSuccess: () => {
        // Don't show success toast - let backend handle the message
      },
      onError: (errors) => {
        toast.error('Plan request failed');
      },
      onFinish: () => setSubmittingPlan(null)
    });
  };

  const handleStartTrial = (planId: number) => {
    if (!checkPermissionWithAuth('trial-plans', auth)) {
      toast.error(t('You do not have permission to start trials'));
      return;
    }
    setSubmittingPlan(planId);
    router.post(route('plans.trial'), {
      plan_id: planId
    }, {
      onSuccess: () => {
        // Don't show success toast - let backend handle the message
      },
      onError: (errors) => {
        if (errors.error) {
          toast.error(errors.error);
        } else {
          toast.error('Trial start failed');
        }
      },
      onFinish: () => setSubmittingPlan(null)
    });
  };

  const handleSubscribe = async (planId: number) => {
    if (!checkPermissionWithAuth('subscribe-plans', auth)) {
      toast.error(t('You do not have permission to subscribe to plans'));
      return;
    }
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setSubmittingPlan(planId);
      try {
        const response = await fetch(route('payment.methods'));
        if (!response.ok) {
          toast.error(t('Failed to load payment methods'));
          setSubmittingPlan(null);
          return;
        }
        const paymentData = await response.json();

        // Check for demo mode restriction for company users
        if (paymentData.is_demo && paymentData.user_type === 'company') {
          toast.error('Payment subscriptions are disabled in demo mode. This feature is available in the full version.');
          setSubmittingPlan(null);
          return;
        }

        setSubmittingPlan(null);
        setSelectedPlan({ ...plan, paymentMethods: paymentData });
        setIsSubscriptionModalOpen(true);
      } catch (error) {
        toast.error(t('Failed to load payment methods'));
        setSubmittingPlan(null);
      }
    }
  };

  const formatPaymentMethods = (paymentSettings: any) => {
    const methods = [];

    if (paymentSettings?.is_bank_enabled === true || paymentSettings?.is_bank_enabled === '1') {
      methods.push({
        id: 'bank',
        name: t('Bank Transfer'),
        icon: <Banknote className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_stripe_enabled === true || paymentSettings?.is_stripe_enabled === '1') {
      methods.push({
        id: 'stripe',
        name: t('Stripe'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_paypal_enabled === true || paymentSettings?.is_paypal_enabled === '1') {
      methods.push({
        id: 'paypal',
        name: t('PayPal'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_razorpay_enabled === true || paymentSettings?.is_razorpay_enabled === '1') {
      methods.push({
        id: 'razorpay',
        name: t('Razorpay'),
        icon: <IndianRupee className="h-5 w-5" />,
        enabled: true
      });
    }

    if ((paymentSettings?.is_mercadopago_enabled === true || paymentSettings?.is_mercadopago_enabled === '1') && paymentSettings?.mercadopago_access_token) {
      methods.push({
        id: 'mercadopago',
        name: t('MercadoPago'),
        icon: <Wallet className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_paystack_enabled === true || paymentSettings?.is_paystack_enabled === '1') {
      methods.push({
        id: 'paystack',
        name: t('Paystack'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_flutterwave_enabled === true || paymentSettings?.is_flutterwave_enabled === '1') {
      methods.push({
        id: 'flutterwave',
        name: t('Flutterwave'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_paytabs_enabled === true || paymentSettings?.is_paytabs_enabled === '1') {
      methods.push({
        id: 'paytabs',
        name: t('PayTabs'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_skrill_enabled === true || paymentSettings?.is_skrill_enabled === '1') {
      methods.push({
        id: 'skrill',
        name: t('Skrill'),
        icon: <Wallet className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_coingate_enabled === true || paymentSettings?.is_coingate_enabled === '1') {
      methods.push({
        id: 'coingate',
        name: t('CoinGate'),
        icon: <Coins className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_payfast_enabled === true || paymentSettings?.is_payfast_enabled === '1') {
      methods.push({
        id: 'payfast',
        name: t('Payfast'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_tap_enabled === true || paymentSettings?.is_tap_enabled === '1') {
      methods.push({
        id: 'tap',
        name: t('Tap'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_xendit_enabled === true || paymentSettings?.is_xendit_enabled === '1') {
      methods.push({
        id: 'xendit',
        name: t('Xendit'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_paytr_enabled === true || paymentSettings?.is_paytr_enabled === '1') {
      methods.push({
        id: 'paytr',
        name: t('PayTR'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_mollie_enabled === true || paymentSettings?.is_mollie_enabled === '1') {
      methods.push({
        id: 'mollie',
        name: t('Mollie'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_toyyibpay_enabled === true || paymentSettings?.is_toyyibpay_enabled === '1') {
      methods.push({
        id: 'toyyibpay',
        name: t('toyyibPay'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_cashfree_enabled === true || paymentSettings?.is_cashfree_enabled === '1') {
      methods.push({
        id: 'cashfree',
        name: t('Cashfree'),
        icon: <IndianRupee className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_khalti_enabled === true || paymentSettings?.is_khalti_enabled === '1') {
      methods.push({
        id: 'khalti',
        name: t('Khalti'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_iyzipay_enabled === true || paymentSettings?.is_iyzipay_enabled === '1') {
      methods.push({
        id: 'iyzipay',
        name: t('Iyzipay'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_benefit_enabled === true || paymentSettings?.is_benefit_enabled === '1') {
      methods.push({
        id: 'benefit',
        name: t('Benefit'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_ozow_enabled === true || paymentSettings?.is_ozow_enabled === '1') {
      methods.push({
        id: 'ozow',
        name: t('Ozow'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_easebuzz_enabled === true || paymentSettings?.is_easebuzz_enabled === '1') {
      methods.push({
        id: 'easebuzz',
        name: t('Easebuzz'),
        icon: <IndianRupee className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_authorizenet_enabled === true || paymentSettings?.is_authorizenet_enabled === '1') {
      methods.push({
        id: 'authorizenet',
        name: t('AuthorizeNet'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_fedapay_enabled === true || paymentSettings?.is_fedapay_enabled === '1') {
      methods.push({
        id: 'fedapay',
        name: t('FedaPay'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_payhere_enabled === true || paymentSettings?.is_payhere_enabled === '1') {
      methods.push({
        id: 'payhere',
        name: t('PayHere'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_cinetpay_enabled === true || paymentSettings?.is_cinetpay_enabled === '1') {
      methods.push({
        id: 'cinetpay',
        name: t('CinetPay'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_paiement_enabled === true || paymentSettings?.is_paiement_enabled === '1') {
      methods.push({
        id: 'paiement',
        name: t('Paiement Pro'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_nepalste_enabled === true || paymentSettings?.is_nepalste_enabled === '1') {
      methods.push({
        id: 'nepalste',
        name: t('Nepalste'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_yookassa_enabled === true || paymentSettings?.is_yookassa_enabled === '1') {
      methods.push({
        id: 'yookassa',
        name: t('YooKassa'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_aamarpay_enabled === true || paymentSettings?.is_aamarpay_enabled === '1') {
      methods.push({
        id: 'aamarpay',
        name: t('Aamarpay'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }

    if (paymentSettings?.is_midtrans_enabled === true || paymentSettings?.is_midtrans_enabled === '1') {
      methods.push({
        id: 'midtrans',
        name: t('Midtrans'),
        icon: <CreditCard className="h-5 w-5" />,
        enabled: true
      });
    }


    return methods;
  };

  // Check if plan is currently active for the DISPLAYED billing cycle (AccountGo logic)
  const isPlanCurrentForCycle = (plan: Plan) => {
    if (!plan.is_current || !currentPlan) return false;
    const userDuration = (currentPlan.duration || '').toLowerCase();
    const displayCycle = billingCycle.toLowerCase();
    // Lifetime or trial: show on any tab
    if (['trial', 'lifetime'].includes(userDuration)) return true;
    return userDuration === displayCycle;
  };

  const getActionButton = (plan: Plan) => {
    // If currently subscribed and on matching billing cycle tab — show expiry info (AccountGo style)
    if (isPlanCurrentForCycle(plan)) {
      return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('Current Plan')}
          </span>
          <p className="text-xs font-medium text-emerald-700 leading-5">
            {currentPlan?.expires_at
              ? `${t('Subscription expires on')}: ${formatArabicDate(currentPlan.expires_at)}`
              : t('Lifetime')}
          </p>
        </div>
      );
    }

    const isLoading = submittingPlan === plan.id;
    const isLoadingAny = submittingPlan !== null;

    if (plan.is_trial_available && !userTrialUsed) {
      return (
        <div className="space-y-2">
          {hasPermission('trial-plans') && (
            <Button
              onClick={() => handleStartTrial(plan.id)}
              disabled={isLoadingAny}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary me-2"></div>
              ) : (
                <Zap className="h-4 w-4 me-2" />
              )}
              {isLoading ? t('Starting...') : t('Start {{days}} Day Trial', { days: plan.trial_days })}
            </Button>
          )}
          {hasPermission('subscribe-plans') && (
            <Button
              onClick={() => handleSubscribe(plan.id)}
              disabled={isLoadingAny}
              className="w-full"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
              ) : null}
              {isLoading ? t('Starting...') : t('Subscribe Now')}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {hasPermission('request-plans') && (
          <Button
            onClick={() => handlePlanRequest(plan.id)}
            disabled={isLoadingAny}
            variant="outline"
            className="w-full"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary me-2"></div>
            ) : (
              <Clock className="h-4 w-4 me-2" />
            )}
            {isLoading ? t('Starting...') : t('Request Plan')}
          </Button>
        )}
        {hasPermission('subscribe-plans') && (
          <Button
            onClick={() => handleSubscribe(plan.id)}
            disabled={isLoadingAny}
            className="w-full"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
            ) : null}
            {isLoading ? t('Starting...') : t('Subscribe Now')}
          </Button>
        )}
      </div>
    );
  };

  // Format a date with Arabic month names and Western (latin) digits,
  // e.g. "17 أغسطس 2027".
  const formatArabicDate = (date: string) => {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  // Normalize storage values like "50GB", "0.5 TB" into clean RTL Arabic
  // labels, e.g. "50 جيجابايت".
  const formatStorageLimit = (storage: string | number): string => {
    if (storage === undefined || storage === null) return '∞';
    const s = String(storage).trim();
    if (/unlimited|∞|-1/i.test(s) || s === '-') return '∞';
    const match = s.match(/([\d.]+)\s*([a-zA-Z]+)/);
    if (match) {
      const units: Record<string, string> = {
        KB: 'كيلوبايت',
        MB: 'ميجابايت',
        GB: 'جيجابايت',
        TB: 'تيرابايت',
        PB: 'بيتابايت',
      };
      const unit = match[2].toUpperCase();
      return `${match[1]} ${units[unit] || unit}`;
    }
    return s;
  };

  // Build the compact usage-limits list rendered at the bottom of each card.
  const buildLimits = (plan: Plan) => {
    const stats = plan.stats || {};
    const rawItems = [
      { key: 'stores', label: t('Stores'), value: stats.stores },
      { key: 'users_per_store', label: t('Users/Store'), value: stats.users_per_store },
      { key: 'products_per_store', label: t('Products/Store'), value: stats.products_per_store },
      { key: 'storage', label: t('Storage'), value: formatStorageLimit(stats.storage) },
      { key: 'templates', label: t('Themes'), value: stats.templates },
      ...(stats.warehouses !== undefined
        ? [{ key: 'warehouses', label: t('Branches'), value: stats.warehouses }]
        : []),
    ];
    return rawItems
      .filter(item => item.value !== undefined && item.value !== null && String(item.value) !== '')
      .map(item => ({ ...item, formattedValue: String(item.value) }));
  };

  // Function to get the appropriate icon for a feature
  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'Custom Domain':
        return <Globe className="h-4 w-4" />;
      case 'Subdomain':
        return <Globe className="h-4 w-4" />;
      case 'PWA':
        return <FileText className="h-4 w-4" />;
      case 'AI Integration':
        return <Bot className="h-4 w-4" />;
      case 'Analytics':
        return <BarChart2 className="h-4 w-4" />;
      case 'Email Support':
        return <Mail className="h-4 w-4" />;
      case 'API Access':
        return <Box className="h-4 w-4" />;
      case 'Priority Support':
        return <Users className="h-4 w-4" />;
      case 'Storage':
        return <HardDrive className="h-4 w-4" />;
      case 'Shipping Method':
        return <Box className="h-4 w-4" />;
      case 'Mobile App':
        return <Store className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  // Function to check if a feature is included in the plan
  const isFeatureIncluded = (plan: Plan, feature: string) => {
    return plan.features.includes(feature);
  };

  // Function to toggle plan status
  const togglePlanStatus = (planId: number) => {
    // Send request to toggle plan status
    router.post(route('plans.toggle-status', planId), {}, {
      preserveState: true,
      onSuccess: () => {
        // Update local state
        setPlans(plans.map(plan =>
          plan.id === planId ? { ...plan, status: !plan.status } : plan
        ));
      }
    });
  };

  // Function to handle delete
  const handleDelete = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleteModalOpen(true);
  };

  // Function to handle delete confirmation
  const handleDeleteConfirm = () => {
    if (planToDelete) {
      router.delete(route('plans.destroy', planToDelete.id), {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setPlanToDelete(null);
        }
      });
    }
  };

  // Common features to display for all plans
  const commonFeatures = [
    'Custom Domain',
    'Subdomain',
    'PWA',
    'AI Integration',
    'Shipping Method',
    'Mobile App'
  ];

  return (
    <PageTemplate
      title={t("Plans")}
      description={t("Manage subscription plans for your customers")}
      url="/plans"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Plans') }
      ]}
    >
      <div className="space-y-8">
        {/* Header with controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {isAdmin ? t("Subscription Plans") : t("Choose Your Plan")}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {isAdmin
                ? t("Create and manage subscription plans to offer different service tiers to your customers.")
                : t("Select the perfect plan for your business needs")
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">{t('All plans are yearly subscriptions')}</span>
            </div>
            {isAdmin && hasPermission('create-plans') && (
              <Button className="w-full sm:w-auto" onClick={() => router.get(route('plans.create'))}>
                <Plus className="h-4 w-4 me-2" />
                {t("Add Plan")}
              </Button>
            )}
          </div>
        </div>

        {/* External services notice */}
        {!isAdmin && (
          <div className="bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl p-4 text-sm font-medium leading-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-semibold mb-1">{t('External Services Notice')}</h4>
                <p>
                  {t('Some features in Growth and Professional plans (e.g., ChatGPT integration, mobile app publishing) require external service subscriptions. These costs are separate from the basic subscription fee and are billed directly by the service provider.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`group relative h-full flex flex-col transition-all duration-300 ${
                plan.recommended
                  ? 'z-10 scale-[1.02] lg:scale-[1.03] hover:scale-[1.04]'
                  : 'hover:scale-[1.01]'
              }`}
            >
              {/* Card with decorative elements */}
              <div className={`
                absolute inset-0 rounded-2xl 
                ${plan.recommended
                  ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/40 shadow-primary/20'
                  : 'bg-gradient-to-br from-gray-100/80 via-gray-50/50 to-transparent border border-gray-200/80'
                } 
                shadow-lg transition-all duration-300 
                group-hover:shadow-xl group-hover:shadow-primary/5
                overflow-hidden
              `}>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -me-16 -mt-16 opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-full -ms-12 -mb-12 opacity-50"></div>
              </div>

              {/* Recommended indicator */}
              {plan.recommended && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center z-20">
                  <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-sm font-medium">
                    <Sparkles className="h-4 w-4" />
                    {t("Recommended")}
                  </div>
                </div>
              )}

              {/* Status indicator - Admin only */}
              {isAdmin && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  {plan.is_default && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {t("Default")}
                    </div>
                  )}
                  <div className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${plan.status
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                    }
                  `}>
                    <span className={`
                      w-2 h-2 rounded-full 
                      ${plan.status ? 'bg-emerald-500' : 'bg-red-500'}
                    `}></span>
                    {plan.status ? t("Active") : t("Inactive")}
                  </div>
                </div>
              )}

              {/* Active ribbon - AccountGo style diagonal banner, only on matching billing cycle tab */}
              {!isAdmin && isPlanCurrentForCycle(plan) && (
                <div className="absolute -top-px -right-px w-[100px] h-[100px] overflow-hidden rounded-tr-2xl z-10 pointer-events-none">
                  <div className="absolute top-[20px] -right-[28px] w-[130px] transform rotate-45 bg-primary/20 text-primary text-[14px] font-semibold text-center py-1 border border-primary/35 shadow-sm backdrop-blur-sm tracking-wide uppercase">
                    {t('Active')}
                  </div>
                </div>
              )}

              {/* Content container */}
              <div className="relative z-10 flex flex-col h-full p-6 pt-8">
                {/* Plan header */}
                <div className="mb-6">
                  <h3 className={`
                    text-2xl font-bold mb-2 
                    ${plan.recommended ? 'text-primary' : ''}
                  `}>
                    {t(plan.name)}
                  </h3>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    {plan.is_free ? (
                      <span className={`
                        text-3xl font-extrabold 
                        ${plan.recommended ? 'text-primary' : ''}
                      `}>
                        {t('Free')}
                      </span>
                    ) : (
                      <>
                        <span className={`
                          text-3xl font-extrabold 
                          ${plan.recommended ? 'text-primary' : ''}
                        `}>
                          {plan.formatted_price || formatSubscriptionPrice(plan.price)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          / {t('yearly')}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                    {t(plan.description)}
                  </p>
                  {plan.trial_days > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('{{days}} days free trial', { days: plan.trial_days })}
                    </div>
                  )}
                </div>

                {/* Divider with icon */}
                <div className="relative flex items-center my-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <div className="mx-3 bg-primary/10 text-primary p-1.5 rounded-full">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                {/* Features */}
                <div className="mb-6 flex-1">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("Features")}
                  </h4>
                  <ul className="space-y-2.5">
                    {commonFeatures.map((feature, index) => {
                      const included = isFeatureIncluded(plan, feature);
                      return (
                        <li key={index} className="flex items-center gap-3">
                          {included ? (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                              <X className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span className={`text-sm ${included ? 'font-medium' : 'text-muted-foreground'}`}>
                            {t(feature)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Usage limits */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("Usage Limits")}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                    {buildLimits(plan).map((limit) => (
                      <div key={limit.key} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border text-xs">
                        <span className="text-muted-foreground truncate">{limit.label}</span>
                        <span className="font-semibold" dir="ltr">{limit.formattedValue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-4 border-t border-gray-200">
                  {isAdmin ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plan.status}
                          onCheckedChange={() => togglePlanStatus(plan.id)}
                          className={plan.status ? "data-[state=checked]:bg-primary" : ""}
                        />
                        <span className="text-sm text-muted-foreground">
                          {plan.status ? t("Active") : t("Inactive")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission('edit-plans') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-gray-200 hover:border-primary hover:text-primary"
                            title={t("Edit")}
                            onClick={() => router.get(route('plans.edit', plan.id))}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {!plan.is_default && hasPermission('delete-plans') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-gray-200 hover:border-red-400 hover:text-red-600"
                            title={t("Delete")}
                            onClick={() => handleDelete(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    getActionButton(plan)
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Modal - Admin only */}
        {isAdmin && (
          <CrudDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            itemName={planToDelete?.name || ''}
            entityName="plan"
          />
        )}

        {/* Subscription Modal - Company only */}
        {!isAdmin && selectedPlan && (
          <PlanSubscriptionModal
            isOpen={isSubscriptionModalOpen}
            onClose={() => {
              setIsSubscriptionModalOpen(false);
              setSelectedPlan(null);
            }}
            plan={selectedPlan}
            billingCycle={billingCycle}
            paymentMethods={formatPaymentMethods(selectedPlan.paymentMethods)}
          />
        )}
      </div>
    </PageTemplate>
  );
}