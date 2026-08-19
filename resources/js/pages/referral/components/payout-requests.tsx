import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { Plus, Check, X, Search, Wallet } from 'lucide-react';
import { useForm, router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { formatCurrency } from '@/utils/currency-helper';
import InputError from '@/components/input-error';


import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface PayoutRequestsProps {
  userType: string;
  payoutRequests: any;
  settings: any;
  stats: any;
  formattedSettings?: any;
}

export default function PayoutRequests({ userType, payoutRequests, settings, stats, formattedSettings }: PayoutRequestsProps) {
  const { t } = useTranslation();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, setData, post, processing, errors, reset } = useForm({
    amount: '',
  });

  const { data: rejectData, setData: setRejectData, post: postReject, processing: rejectProcessing, errors: rejectErrors } = useForm({
    notes: '',
  });

  const filteredRequests = useMemo(() => {
    const requests = payoutRequests.data || [];
    return requests.filter((request: any) => {
      const matchesSearch = !searchQuery ||
        request.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.company?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.formatted_amount?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payoutRequests.data, searchQuery, statusFilter]);

  const handleCreatePayout = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('referral.payout-request.create'), {
      onSuccess: () => {
        setShowCreateDialog(false);
        reset();
        toast.success(t('Payout request submitted successfully'));
      },
    });
  };

  const handleApprove = (request: any) => {
    post(route('referral.payout-request.approve', request.id));
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      postReject(route('referral.payout-request.reject', selectedRequest.id), {
        onSuccess: () => {
          setShowRejectDialog(false);
          setSelectedRequest(null);
          setRejectData('notes', '');
        },
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      approved: 'success',
      rejected: 'destructive',
    } as const;

    const labels: Record<string, string> = {
      pending: t('Pending'),
      approved: t('Approved'),
      rejected: t('Rejected'),
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {userType === 'company' && (() => {
        const belowMin = stats.availableBalance < settings.threshold_amount;
        const minMessage = t('You need at least {{amount}} to request a payout', { amount: formattedSettings?.formattedThresholdAmount || '0' });
        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-blue-200/70 bg-blue-50/60 p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900">{t('Create Payout Request')}</p>
                <p className="mt-1 text-sm text-blue-700 leading-6">
                  {belowMin
                    ? minMessage
                    : t('You can request up to {{amount}} for payout', { amount: stats.formattedAvailableBalance || '0' })}
                </p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              {belowMin ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-not-allowed">
                        <Button disabled aria-disabled="true" className="cursor-not-allowed">
                          <Plus className="h-4 w-4 ms-2" />
                          {t('Request Payout')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{minMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <DialogTrigger asChild>
                  <Button className="flex-shrink-0">
                    <Plus className="h-4 w-4 ms-2" />
                    {t('Request Payout')}
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('Create Payout Request')}</DialogTitle>
                </DialogHeader>
                <form noValidate onSubmit={handleCreatePayout} className="space-y-4">
                  <div className="grid gap-1 mb-4">
                    <Label htmlFor="amount" required>{t('Amount')}</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min={settings.threshold_amount}
                      max={stats.availableBalance}
                      value={data.amount}
                      onChange={(e) => setData('amount', e.target.value)}
                      placeholder={`Min: ${formattedSettings?.formattedThresholdAmount || '0'}`}
                      aria-invalid={!!errors.amount}
                      dir="ltr"
                    />
                    <InputError message={errors.amount} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{t('Available Balance')}: <span dir="ltr">{stats.formattedAvailableBalance || '0'}</span></p>
                    <p>{t('Minimum Amount')}: <span dir="ltr">{formattedSettings?.formattedThresholdAmount || '0'}</span></p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                      {t('Submit Request')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              {userType === 'superadmin' ? t('All Payout Requests') : t('Your Payout Requests')}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search by company name or email...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 pe-3 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Statuses')}</SelectItem>
                  <SelectItem value="pending">{t('Pending')}</SelectItem>
                  <SelectItem value="approved">{t('Approved')}</SelectItem>
                  <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? t('No payout requests match your filters.')
                  : t('No payout requests found.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {userType === 'superadmin' && <TableHead>{t('Company')}</TableHead>}
                    <TableHead>{t('Amount')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    {userType === 'superadmin' && <TableHead>{t('Actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request: any) => (
                    <TableRow key={request.id}>
                      {userType === 'superadmin' && (
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.company?.name}</p>
                            <p className="text-sm text-muted-foreground">{request.company?.email}</p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell dir="ltr" className="text-end font-medium">{request.formatted_amount || '0'}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{window.appSettings?.formatDateTime(request.created_at, false) || new Date(request.created_at).toLocaleDateString()}</TableCell>
                      {userType === 'superadmin' && request.status === 'pending' && (
                        <TableCell>
                          <div className="flex justify-start gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleApprove(request)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('Approve')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('Reject')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {payoutRequests.last_page > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('Showing {{from}} to {{to}} of {{total}} results', {
                  from: payoutRequests.from,
                  to: payoutRequests.to,
                  total: payoutRequests.total,
                })}
              </p>
              <div className="flex gap-1">
                {payoutRequests.links.map((link: any, i: number) => (
                  <Button
                    key={i}
                    variant={link.active ? 'default' : 'outline'}
                    size="sm"
                    disabled={!link.url}
                    onClick={() => { if (link.url) router.visit(link.url, { preserveState: true, preserveScroll: true }); }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Payout Request')}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleReject} className="space-y-4">
            <div className="grid gap-1 mb-4">
              <Label htmlFor="notes">{t('Rejection Reason')}</Label>
              <Textarea
                id="notes"
                name="notes"
                value={rejectData.notes}
                onChange={(e) => setRejectData('notes', e.target.value)}
                placeholder={t('Enter reason for rejection...')}
                aria-invalid={!!rejectErrors.notes}
              />
              <InputError message={rejectErrors.notes} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowRejectDialog(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectProcessing}>
                {t('Reject Request')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
