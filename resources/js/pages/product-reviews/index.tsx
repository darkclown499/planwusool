import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Star, Download, Trash2, CheckCircle, Reply } from 'lucide-react';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { Textarea } from '@/components/ui/textarea';

export default function ProductReviews() {
  const { t } = useTranslation();
  const { reviews = { data: [] }, stats = { total: 0, approved: 0, pending: 0, average_rating: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, auth } = usePage().props as any;
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; reviewId: number | null }>({ open: false, reviewId: null });
  const [replyText, setReplyText] = useState('');

  const handleApprove = (reviewId: number) => {
    if (!checkPermission('approve-product-reviews', auth)) return;
    router.post(route('product-reviews.approve', reviewId), {}, { preserveScroll: true });
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

  return (
    <PageTemplate
      title={t('Product Reviews')}
      description={t('Manage customer product reviews')}
      url="/product-reviews"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Reviews') }
      ]}
      actions={[
        ...(hasPermission('export-product-reviews') ? [{
          label: t('Export'),
          icon: <Download className="h-4 w-4" />,
          variant: 'outline' as const,
          onClick: handleExport
        }] : [])
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Reviews')}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Approved')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Pending')}</CardTitle>
              <Star className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Average Rating')}</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.average_rating || 0).toFixed(1)} ★</div>
              <div className="text-xs text-muted-foreground">{renderStars(Math.round(stats.average_rating || 0))}</div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Reviews')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviews.data.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No reviews found')}</p>
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
                      {reviews.data.map((review: any) => (
                        <tr key={review.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{review.product?.name || 'N/A'}</td>
                          <td className="py-3 px-4">{review.customer?.first_name} {review.customer?.last_name}</td>
                          <td className="py-3 px-4">{renderStars(review.rating)}</td>
                          <td className="py-3 px-4 max-w-xs truncate">{review.comment || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                              {review.is_approved ? t('Approved') : t('Pending')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {!review.is_approved && hasPermission('approve-product-reviews') && (
                                <Button variant="ghost" size="sm" onClick={() => handleApprove(review.id)}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              {hasPermission('reply-product-reviews') && (
                                <Button variant="ghost" size="sm" onClick={() => handleReply(review.id)}>
                                  <Reply className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission('delete-product-reviews') && (
                                <Button variant="ghost" size="sm" onClick={() => setReviewToDelete(review.id)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
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

