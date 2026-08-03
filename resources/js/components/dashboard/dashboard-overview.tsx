import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Zap,
  ArrowRight,
  Sparkles,
  Building2,
  CreditCard,
  Tag,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { hasPermission } from '@/utils/permissions';

interface DashboardOverviewProps {
  userType: 'superadmin' | 'company';
  stats: {
    totalCompanies?: number;
    totalStores?: number;
    activeStores?: number;
    totalPlans?: number;
    activePlans?: number;
    totalRevenue?: number;
    orders?: number;
    products?: number;
    customers?: number;
    revenue?: number;
  };
}

export function DashboardOverview({ userType, stats }: DashboardOverviewProps) {
  const { t } = useTranslation();
  const { themeColor, customColor, titleText } = useBrand();
  
  const getThemeColorValue = () => {
    return themeColor === 'custom' ? customColor : THEME_COLORS[themeColor];
  };
  
  const themeColorName = themeColor === 'custom' ? 'green' : themeColor;

  if (userType === 'superadmin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            {t(`${titleText || 'Wusool'} Platform Overview`)}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('Comprehensive multi-store e-commerce platform with advanced features')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Company Management */}
            <div className="group cursor-pointer" onClick={() => router.visit(route('companies.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-blue-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-blue-100 text-blue-600 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                      {stats.totalCompanies || 0}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-blue-600 transition-colors">
                    {t('Company Management')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Manage registered companies and their store subscriptions')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:gap-1 transition-all">
                    {t('Manage Companies')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Management */}
            <div className="group cursor-pointer" onClick={() => router.visit(route('plans.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-green-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-green-100 text-green-600 shadow-sm">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                      {stats.activePlans || 0}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-green-600 transition-colors">
                    {t('Plan Management')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Configure subscription plans, pricing, and features')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-green-600 group-hover:gap-1 transition-all">
                    {t('Manage Plans')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Management */}
            <div className="group cursor-pointer" onClick={() => router.visit(route('referral.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-purple-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-purple-100 text-purple-600 shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100">
                      <TrendingUp className="h-2 w-2 me-1" />
                      {t('Active')}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-purple-600 transition-colors">
                    {t('Referral System')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Manage referral programs and commission tracking')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-purple-600 group-hover:gap-1 transition-all">
                    {t('Manage Referrals')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="group cursor-pointer" onClick={() => router.visit(route('settings'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-orange-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-orange-100 text-orange-600 shadow-sm">
                      <Settings className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-100">
                      <Zap className="h-2 w-2 me-1" />
                      {t('Live')}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-orange-600 transition-colors">
                    {t('System Settings')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Configure platform settings and system preferences')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-orange-600 group-hover:gap-1 transition-all">
                    {t('System Settings')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Features */}
          <div className={`mt-6 p-4 rounded-lg bg-gradient-to-r from-${themeColorName}-50 to-${themeColorName === 'green' ? 'emerald' : themeColorName}-50 border border-${themeColorName}-200`}>
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 bg-${themeColorName}-100 text-${themeColorName}-600`}>
                <Globe className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-${themeColorName}-900 mb-1`}>
                  {t(`${titleText || 'Wusool'} SaaS Platform`)}
                </h3>
                <p className={`text-sm text-${themeColorName}-700 mb-3`}>
                  {t('Complete multi-tenant e-commerce solution enabling companies to create and manage multiple online stores with advanced subscription management.')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                    {t('Multi-Store Platform')}
                  </Badge>
                  <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                    {t('Subscription Management')}
                  </Badge>
                  <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                    {t('System Analytics')}
                  </Badge>
                  <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                    {t('Revenue Tracking')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Company user overview
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-green-600" />
          {t('Store Management')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('Manage your online store with powerful e-commerce tools')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Products */}
          {hasPermission('manage-products') && (
            <div className="group cursor-pointer" onClick={() => router.visit(route('products.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-blue-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-blue-100 text-blue-600 shadow-sm">
                      <Package className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                      {stats.products || 0}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-blue-600 transition-colors">
                    {t('Product Catalog')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Manage your product inventory and listings')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:gap-1 transition-all">
                    {t('Manage Products')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders */}
          {hasPermission('manage-orders') && (
            <div className="group cursor-pointer" onClick={() => router.visit(route('orders.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-green-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-green-100 text-green-600 shadow-sm">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                      {stats.orders || 0}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-green-600 transition-colors">
                    {t('Order Management')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Process and track customer orders')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-green-600 group-hover:gap-1 transition-all">
                    {t('View Orders')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customers */}
          {hasPermission('manage-customers') && (
            <div className="group cursor-pointer" onClick={() => router.visit(route('customers.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-purple-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-purple-100 text-purple-600 shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100">
                      {stats.customers || 0}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-purple-600 transition-colors">
                    {t('Customer Base')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Manage customer relationships and data')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-purple-600 group-hover:gap-1 transition-all">
                    {t('View Customers')} <ArrowRight className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics */}
          {hasPermission('manage-analytics') && (
            <div className="group cursor-pointer" onClick={() => router.visit(route('analytics.index'))}>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-orange-500/50 hover:-translate-y-1">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-lg p-2.5 bg-orange-100 text-orange-600 shadow-sm">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-100">
                      <BarChart3 className="h-2 w-2 me-1" />
                      {t('Live')}
                    </Badge>
                  </div>
                  <h3 className="font-bold mb-1.5 text-sm group-hover:text-orange-600 transition-colors">
                    {t('Store Analytics')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-grow">
                    {t('Track performance and insights')}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-orange-600 group-hover:gap-1 transition-all">
                    {t('View Analytics')} <BarChart3 className="h-3 w-3 ms-1" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wusool Features */}
        <div className={`mt-6 p-4 rounded-lg bg-gradient-to-r from-${themeColorName}-50 to-${themeColorName === 'green' ? 'emerald' : themeColorName}-50 border border-${themeColorName}-200`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-full p-2 bg-${themeColorName}-100 text-${themeColorName}-600`}>
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-${themeColorName}-900 mb-1`}>
                {t(`${titleText || 'Wusool'} Features`)}
              </h3>
              <p className={`text-sm text-${themeColorName}-700 mb-3`}>
                {t('Complete e-commerce solution with powerful store management tools and comprehensive analytics.')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                  {t('Store Management')}
                </Badge>
                <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                  {t('Product Catalog')}
                </Badge>
                <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                  {t('Order Processing')}
                </Badge>
                <Badge variant="outline" className={`text-xs bg-white/50 text-${themeColorName}-700 border-${themeColorName}-300`}>
                  {t('Customer Analytics')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}