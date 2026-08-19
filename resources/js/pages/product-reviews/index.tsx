import React, { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Star, StarOff, Download, Trash2, CheckCircle2, Clock, Reply, XCircle, MessageSquare, Search } from 'lucide-react';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { Textarea } from '@/components/ui/textarea';

export default function ProductReviews() {
  const { t } = useTranslation();
  const { reviews = { data: [] }, stats = { total: 0, approved: 0, pending: 0, rejected: 0, average_rating: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, filters = {}, auth } = usePage().props as any;

  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const [rating, setRating] = useState(filters.rating || 'all');
  const didMount = useRef(false);

  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; reviewId: number | null }>({ open: false, reviewId: null });
  const [replyText, setReplyText] = useState('');

  const applyFilters = () => {
    router.get(
      route('product-reviews.index'),
      {
        search: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
        rating: rating === 'all' ? undefined : rating,
      },
      { preserveState: true, replace: true, preserveScroll: true }
    );
  };

  const handleApprove = (reviewId: number) => {
    if (!checkPermission('approve-product-reviews', auth)) return;
    router.post(route('product-reviews.approve', reviewId), {}, { preserveScroll: true });
  };

  const handleReject = (reviewId: number) => {
    if (!checkPermission('approve-product-reviews', auth)) return;
    router.post(route('product-reviews.reject', reviewId), {}, { preserveScroll: true });
  };

  const handleReply = (reviewId: number) => {
    if (!checkPermission('reply-product-reviews', auth)) return;
    setReplyDialog({ open: true, reviewId });
  };

  const submitReply = () => {
    if (!replyText.trim() || !replyDialog.reviewId) return;
    router.post(route('product-reviews.reply', replyDialog.reviewId), { admin_reply: replyText }, {
      preserveScroll: true,
      onSuccess: () => {
        setReplyDialog({ open: false, reviewId: null });
        setReplyText('');
      }
    });
  };

  const handleDelete = () => {
    if (reviewToDelete && checkPermission('delete-product-reviews', auth)) {
      router.delete(route('product-reviews.destroy', reviewToDelete));
      setReviewToDelete(null);
    }
  };

  const handleExport = () => {
    if (!checkPermission('export-product-reviews', auth)) return;
    window.open(route('product-reviews.export'), '_blank');
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star key={i} className={`h-4 w-4 inline-block ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
    ));
  };

  const getStatusBadge = (review: any) => {
    if (review.is_rejected) return { variant: 'destructive' as const, label: t('Rejected') };
    if (review.is_approved) return { variant: 'default' as const, label: t('Approved') };
    return { variant: 'secondary' as const, label: t('Pending') };
  };

  useEffect(() => {
    if (!didMount.current) return;
    const debounce = setTimeout(applyFilters, 400);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, rating]);

  return (
    <PageTemplate
      title={t('Product Reviews')}
      description={t('Manage customer product reviews')}
      url="/product-reviews"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Reviews') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Total Reviews')}</p>
                <div className="mt-2 text-2xl font-bold text-foreground">{stats.total || 0}</div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquare className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Approved')}</p>
                <div className="mt-2 text-2xl font-bold text-green-600">{stats.approved || 0}</div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Pending')}</p>
                <div className="mt-2 text-2xl font-bold text-amber-600">{stats.pending || 0}</div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Average Rating')}</p>
                <div className="mt-2 text-2xl font-bold text-foreground">{Number(stats.average_rating || 0).toFixed(1)} ★</div>
                <div className="mt-2">{renderStars(Math.round(stats.average_rating || 0))}</div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-500">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search by product name, customer, or review text...')}
                className="ps-9"
                aria-label={t('Search by product name, customer, or review text...')}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                <SelectItem value="approved">{t('Approved')}</SelectItem>
                <SelectItem value="pending">{t('Pending')}</SelectItem>
                <SelectItem value="rejected">{t('Rejected')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All ratings')}</SelectItem>
                <SelectItem value="5">{t('5 stars')}</SelectItem>
                <SelectItem value="4">{t('4 stars')}</SelectItem>
                <SelectItem value="3">{t('3 stars')}</SelectItem>
                <SelectItem value="2">{t('2 stars')}</SelectItem>
                <SelectItem value="1">{t('1 star')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasPermission('export-product-reviews') && (
            <Button type="button" variant="outline" onClick={handleExport} className="shrink-0">
              <Download className="h-4 w-4 me-2" />
              {t('Export')}
            </Button>
          )}
        </div>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t('Reviews')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviews.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <StarOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-[10px] font-bold">!</span>
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{t('No product reviews yet')}</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {t('Reviews and customer feedback will appear here for you to review and approve them before publishing.')}
                  </p>
                  <Button
                    type="button"
                    className="mt-6"
                    onClick={() => router.visit(route('stores.settings', auth?.user?.current_store ?? 1))}
                  >
                    <MessageSquare className="h-4 w-4 me-2" />
                    {t('Review settings')}
                  </Button>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-4 font-medium">{t('Product')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Customer')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Rating')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Comment')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Status')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.data.map((review: any) => {
                        const badge = getStatusBadge(review);
                        return (
                          <tr key={review.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{review.product?.name || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{review.customer?.first_name} {review.customer?.last_name || ''}</div>
                              {review.customer?.email && <div className="text-xs text-muted-foreground">{review.customer.email}</div>}
                            </td>
                            <td className="py-3 px-4">{renderStars(review.rating)}</td>
                            <td className="py-3 px-4 max-w-xs truncate">{review.comment || '-'}</td>
                            <td className="py-3 px-4">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                {!review.is_approved && hasPermission('approve-product-reviews') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApprove(review.id)}
                                    title={t('Approve')}
                                    aria-label={t('Approve')}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                {!review.is_rejected && !review.is_approved && hasPermission('approve-product-reviews') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(review.id)}
                                    title={t('Reject')}
                                    aria-label={t('Reject')}
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                                {hasPermission('reply-product-reviews') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReply(review.id)}
                                    title={t('Reply')}
                                    aria-label={t('Reply')}
                                  >
                                    <Reply className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                {hasPermission('delete-product-reviews') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReviewToDelete(review.id)}
                                    title={t('Delete')}
                                    aria-label={t('Delete')}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </td>
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

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onOpenChange={(open) => !open && setReplyDialog({ open: false, reviewId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reply to Review')}</DialogTitle>
            <DialogDescription>{t('Write a reply to this customer review')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t('Write your reply...')}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyDialog({ open: false, reviewId: null }); setReplyText(''); }}>
              {t('Cancel')}
            </Button>
            <Button onClick={submitReply} disabled={!replyText.trim()}>
              {t('Submit Reply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!reviewToDelete} onOpenChange={(open) => !open && setReviewToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Review')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to delete this review?')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewToDelete(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}