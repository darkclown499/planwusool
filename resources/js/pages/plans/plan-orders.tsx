import { PageTemplate } from '@/components/page-template';
import { CrudTable } from '@/components/CrudTable';
import { planOrdersConfig } from '@/config/crud/plan-orders';
import { useEffect, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Filter, Search, Eye, Download, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-helper';
import { cn } from '@/lib/utils';

export default function PlanOrdersPage() {
  const { t } = useTranslation();
  const { planOrders, filters: pageFilters = {}, auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  
  useEffect(() => {
    const initialFilters: Record<string, any> = {};
    planOrdersConfig.filters?.forEach(filter => {
      initialFilters[filter.key] = pageFilters[filter.key] || 'all';
    });
    setFilterValues(initialFilters);
  }, []);

  const handleAction = (action: string, item: any) => {
    if (action === 'approve') {
      router.post(route("plan-orders.approve", item.id));
    } else if (action === 'reject') {
      setSelectedOrder(item);
      setShowRejectDialog(true);
    } else if (action === 'show') {
      setSelectedOrder(item);
      setShowViewDialog(true);
    }
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrder) {
      router.post(route("plan-orders.reject", selectedOrder.id), { notes: rejectionNotes }, {
        onSuccess: () => {
          setShowRejectDialog(false);
          setSelectedOrder(null);
          setRejectionNotes('');
        }
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    const params: any = { page: 1 };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params[key] = value;
      }
    });
    
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    router.get(route("plan-orders.index"), params, { preserveState: true, preserveScroll: true });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    
    const params: any = { page: 1 };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    const newFilters = { ...filterValues, [key]: value };
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== 'all') {
        params[k] = v;
      }
    });
    
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    router.get(route("plan-orders.index"), params, { preserveState: true, preserveScroll: true });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Plans'), href: route('plans.index') },
    { title: t('Subscription Invoices') }
  ];

  const hasActiveFilters = () => {
    return Object.entries(filterValues).some(([key, value]) => {
      return value && value !== '';
    }) || searchTerm !== '';
  };



  return (
    <PageTemplate 
      title={t('Subscription Invoices')} 
      url="/plan-orders"
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('Search plan orders...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>
                <Button type="submit" size="sm">
                  <Search className="h-4 w-4 mr-1.5" />
                  {t('Search')}
                </Button>
              </form>
              
              {planOrdersConfig.filters && planOrdersConfig.filters.length > 0 && (
                <div className="ml-2">
                  <Button 
                    variant={hasActiveFilters() ? "default" : "outline"}
                    size="sm" 
                    className="h-8 px-2 py-1"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    {showFilters ? t('Hide Filters') : t('Filters')}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
              <Select 
                value={pageFilters.per_page?.toString() || "10"} 
                onValueChange={(value) => {
                  const params: any = { page: 1, per_page: parseInt(value) };
                  
                  if (searchTerm) {
                    params.search = searchTerm;
                  }
                  
                  Object.entries(filterValues).forEach(([key, val]) => {
                    if (val && val !== '') {
                      params[key] = val;
                    }
                  });
                  
                  router.get(route('plan-orders.index'), params, { preserveState: true, preserveScroll: true });
                }}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {showFilters && planOrdersConfig.filters && planOrdersConfig.filters.length > 0 && (
            <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
              <div className="flex flex-wrap gap-4 items-end">
                {planOrdersConfig.filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <Label>{t(filter.label)}</Label>
                    <Select 
                      value={filterValues[filter.key] || ''} 
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={t(`All ${filter.label}`)} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={planOrdersConfig.table.columns.map(col => ({
            ...col,
            label: t(col.label)
          }))}
          actions={(planOrdersConfig.table.actions || []).map(action => ({
            ...action,
            label: t(action.label)
          }))}
          data={planOrders?.data || []}
          from={planOrders?.from || 1}
          onAction={handleAction}
          permissions={permissions}
          entityPermissions={planOrdersConfig.entity.permissions}
        />

        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t('Showing')} <span className="font-medium">{planOrders?.from || 0}</span> {t('to')} <span className="font-medium">{planOrders?.to || 0}</span> {t('of')} <span className="font-medium">{planOrders?.total || 0}</span> {t('plan orders')}
          </div>
          
          <div className="flex gap-1">
            {planOrders?.links?.map((link: any, i: number) => {
              const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
              const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");
              
              return (
                <Button
                  key={i}
                  variant={link.active ? 'default' : 'outline'}
                  size={isTextLink ? "sm" : "icon"}
                  className={isTextLink ? "px-3" : "h-8 w-8"}
                  disabled={!link.url}
                  onClick={() => link.url && router.get(link.url)}
                >
                  {isTextLink ? t(label) : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Plan Order')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <Label htmlFor="notes">{t('Rejection Reason')}</Label>
              <Textarea
                id="notes"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder={t('Enter reason for rejection (optional)...')}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowRejectDialog(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="destructive">
                {t('Reject Order')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Plan Order Details')}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('Order Number')}</Label>
                  <p className="font-medium">{selectedOrder.order_number}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('Status')}</Label>
                  <div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                      selectedOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                        selectedOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                    )}>
                      {t(selectedOrder.status)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('User Name')}</Label>
                  <p>{selectedOrder.user?.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('User Email')}</Label>
                  <p>{selectedOrder.user?.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('Plan Name')}</Label>
                  <p>{selectedOrder.plan?.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('Order Date')}</Label>
                  <p>{new Date(selectedOrder.ordered_at).toLocaleDateString([], { dateStyle: 'long' })}</p>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-semibold">{t('Pricing Information')}</h4>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('Original Price')}</span>
                    <span>{formatCurrency(selectedOrder.original_price)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{t('Discount')} ({selectedOrder.coupon_code})</span>
                      <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-bold">
                    <span>{t('Final Price')}</span>
                    <span>{formatCurrency(selectedOrder.final_price)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.payment_method === 'bank' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    {t('Bank Transfer Proof')}
                  </div>
                  {selectedOrder.receipt ? (
                    <div className="mt-1">
                      <a
                        href={getImageUrl('/storage/' + selectedOrder.receipt)}
                        download={`receipt_${selectedOrder.order_number}`}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-all"
                      >
                        <Download className="h-4 w-4" />
                        {t('Download Receipt')}
                      </a>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      {t('No receipt uploaded (likely $0 amount)')}
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.notes && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('Notes/Reason')}</Label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm italic">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
            {selectedOrder?.status === 'pending' && permissions.includes('approve-plan-orders') && (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setShowViewDialog(false);
                  handleAction('approve', selectedOrder);
                }}
              >
                <Check className="h-4 w-4 mr-1.5" />
                {t('Approve')}
              </Button>
            )}
            {selectedOrder?.status === 'pending' && permissions.includes('reject-plan-orders') && (
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  setShowViewDialog(false);
                  handleAction('reject', selectedOrder);
                }}
              >
                <X className="h-4 w-4 mr-1.5" />
                {t('Reject')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}