import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

export default function DigitalDownloads() {
  const { t } = useTranslation();
  const { downloads = { data: [], links: [] } } = usePage().props as any;

  const getStatus = (download: any) => {
    if (download.expires_at && new Date(download.expires_at).getTime() < Date.now()) {
      return { variant: 'destructive' as const, label: t('Expired') };
    }
    if (download.download_count >= download.max_downloads) {
      return { variant: 'secondary' as const, label: t('Limit reached') };
    }
    return { variant: 'default' as const, label: t('Active') };
  };

  return (
    <PageTemplate
      title={t('Digital Downloads')}
      description={t('Manage digital downloads')}
      url="/digital-downloads"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Digital Downloads') }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('Downloads')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {downloads.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{t('No downloads yet')}</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {t('Downloads will appear here when customers purchase downloadable products.')}
                </p>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start py-3 px-4 font-medium">{t('Product')}</th>
                      <th className="text-start py-3 px-4 font-medium">{t('Customer')}</th>
                      <th className="text-start py-3 px-4 font-medium">{t('Order')}</th>
                      <th className="text-start py-3 px-4 font-medium">{t('File')}</th>
                      <th className="text-center py-3 px-4 font-medium">{t('Downloads')}</th>
                      <th className="text-start py-3 px-4 font-medium">{t('Expires')}</th>
                      <th className="text-start py-3 px-4 font-medium">{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloads.data.map((download: any) => {
                      const status = getStatus(download);
                      return (
                        <tr key={download.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            {download.product?.cover_image && (
                              <img
                                src={download.product.cover_image}
                                alt={download.product?.name || ''}
                                className="me-2 inline-block h-8 w-8 rounded object-cover align-middle"
                              />
                            )}
                            <span className="font-medium">{download.product?.name || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              {download.customer?.first_name} {download.customer?.last_name || ''}
                            </div>
                            {download.customer?.email && (
                              <div className="text-xs text-muted-foreground">{download.customer.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {download.order?.order_number ? `#${download.order.order_number}` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Download className="h-3.5 w-3.5" />
                              <span className="max-w-[160px] truncate">{download.file_name || '-'}</span>
                            </div>
                            {download.file_size && <div className="text-xs text-muted-foreground">{download.file_size}</div>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-semibold">{download.download_count || 0}</span>
                            <span className="text-muted-foreground">/{download.max_downloads || 0}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {download.expires_at ? new Date(download.expires_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {downloads.links && downloads.links.length > 3 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {downloads.from || 0} – {downloads.to || 0} {t('of')} {downloads.total || 0}
                </p>
                <div className="flex gap-1">
                  {downloads.links.map((link: any, idx: number) => {
                    if (link.url === null) {
                      return (
                        <span
                          key={idx}
                          className="px-2 py-1 text-sm text-muted-foreground cursor-not-allowed"
                          dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                      );
                    }
                    return (
                      <Button
                        key={idx}
                        variant={link.active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => router.get(link.url, {}, { preserveScroll: true })}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}