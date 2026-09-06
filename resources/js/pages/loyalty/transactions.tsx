import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import { Star, TrendingUp, TrendingDown, Users } from 'lucide-react';

export default function LoyaltyTransactions() {
  const { t } = useTranslation();
  const { transactions = { data: [] }, stats = { total_points_earned: 0, total_points_redeemed: 0, total_customers: 0 } } = usePage().props as any;

  const getTypeBadge = (type: string) => {
    const variants: any = {
      earn: { variant: 'default' as const, label: t('Earned') },
      redeem: { variant: 'secondary' as const, label: t('Redeemed') },
      signup_bonus: { variant: 'outline' as const, label: t('Signup Bonus') },
      review_bonus: { variant: 'outline' as const, label: t('Review Bonus') },
      adjustment: { variant: 'destructive' as const, label: t('Adjustment') },
      expired: { variant: 'destructive' as const, label: t('Expired') },
      refund: { variant: 'secondary' as const, label: t('Refund') },
    };
    return variants[type] || { variant: 'default' as const, label: type };
  };

  return (
    <PageTemplate
      title={t('Loyalty Transactions')}
      url="/loyalty/transactions"
      description={t('View all loyalty points transactions')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Loyalty Points'), href: route('loyalty.settings') },
        { title: t('Transactions') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Points Earned')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.total_points_earned.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Points Redeemed')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.total_points_redeemed.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Customers Participating')}</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_customers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Transaction History')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.data.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No transactions found')}</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    لا توجد حركة نقاط بعد. ستظهر هنا معاملات كسب نقاط الولاء واستردادها لعملاء متجرك عند تفعيل البرنامج.
                  </p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-4 font-medium">{t('Date')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Customer')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Type')}</th>
                        <th className="text-end py-3 px-4 font-medium">{t('Points')}</th>
                        <th className="text-end py-3 px-4 font-medium">{t('Balance')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Description')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.data.map((txn: any) => {
                        const badge = getTypeBadge(txn.type);
                        return (
                          <tr key={txn.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                              {new Date(txn.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              {txn.customer ? `${txn.customer.first_name} ${txn.customer.last_name}` : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </td>
                            <td className={`py-3 px-4 text-end font-semibold ${txn.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.points > 0 ? '+' : ''}{txn.points.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-end">{txn.balance_after.toLocaleString()}</td>
                            <td className="py-3 px-4 text-muted-foreground">{txn.description || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}

