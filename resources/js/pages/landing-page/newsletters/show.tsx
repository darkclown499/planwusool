import React from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft,
  Mail, 
  Calendar,
  CheckCircle,
  X,
  UserCheck,
  UserX
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { SettingsSection } from '@/components/settings-section';
import { toast } from '@/components/custom-toast';
import { Toaster } from '@/components/ui/toaster';

interface Newsletter {
  id: number;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

interface PageProps {
  newsletter: Newsletter;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  unsubscribed: 'bg-red-100 text-red-800'
};

const statusIcons = {
  active: CheckCircle,
  unsubscribed: X
};

export default function NewsletterShow() {
  const { t } = useTranslation();
  const { newsletter } = usePage<PageProps>().props;

  const updateStatus = (status: 'active' | 'unsubscribed') => {
    router.put(route('landing-page.newsletters.update', newsletter.id), { status }, {
      onSuccess: () => {
        toast.success(t('Newsletter subscription updated successfully!'));
      },
      onError: () => {
        toast.error(t('Failed to update newsletter subscription'));
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatusIcon = statusIcons[newsletter.status];

  return (
    <PageTemplate 
      title={t("Newsletter Subscription Details")} 
      url={`/landing-page/newsletters/${newsletter.id}`}
      action={
        <Button
          variant="outline"
          onClick={() => router.get(route('landing-page.newsletters.index'))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('Back to Newsletters')}
        </Button>
      }
    >
      <SettingsSection
        title={t('Newsletter Subscription Details')}
        description={t('View and manage newsletter subscription')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('Subscription Information')}</span>
                  <Badge className={`${statusColors[newsletter.status]} flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {t(newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1))}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Email Address')}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-lg font-semibold">{newsletter.email}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('Subscribed Date')}</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{formatDate(newsletter.subscribed_at)}</span>
                    </div>
                  </div>
                  
                  {newsletter.unsubscribed_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('Unsubscribed Date')}</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{formatDate(newsletter.unsubscribed_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Created Date')}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{formatDate(newsletter.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {newsletter.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-orange-600 hover:text-orange-700"
                    onClick={() => updateStatus('unsubscribed')}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    {t('Unsubscribe')}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-green-600 hover:text-green-700"
                    onClick={() => updateStatus('active')}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {t('Reactivate')}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open(`mailto:${newsletter.email}`)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('Send Email')}
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Subscription Stats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Status')}</span>
                  <Badge className={statusColors[newsletter.status]}>
                    {t(newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1))}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Days Subscribed')}</span>
                  <span className="text-sm font-medium">
                    {Math.floor((new Date().getTime() - new Date(newsletter.subscribed_at).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsSection>
      <Toaster />
    </PageTemplate>
  );
}