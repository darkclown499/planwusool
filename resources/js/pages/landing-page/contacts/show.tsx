import React, { useState } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  Calendar,
  MessageSquare,
  CheckCircle,
  Clock,
  Target,
  X,
  Send,
  Edit
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { SettingsSection } from '@/components/settings-section';
import { toast } from '@/components/custom-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Contact {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';
  notes: string | null;
  created_at: string;
}

interface PageProps {
  contact: Contact;
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  new: Clock,
  contacted: MessageSquare,
  qualified: Target,
  converted: CheckCircle,
  closed: X
};

export default function ContactShow() {
  const { t } = useTranslation();
  const { contact } = usePage<PageProps>().props;
  const [showReplyDialog, setShowReplyDialog] = useState(false);

  const { data, setData, put, processing } = useForm({
    status: contact.status,
    notes: contact.notes || ''
  });

  const { data: replyData, setData: setReplyData, post: replyPost, processing: replyProcessing, reset: replyReset } = useForm({
    reply_message: ''
  });

  const updateContact = () => {
    put(route('landing-page.contacts.update', contact.id), {
      onSuccess: () => {
        toast.success(t('Contact updated successfully!'));
      },
      onError: () => {
        toast.error(t('Failed to update contact'));
      }
    });
  };

  const sendReply = () => {
    replyPost(route('landing-page.contacts.reply', contact.id), {
      onSuccess: () => {
        toast.success(t('Reply sent successfully!'));
        setShowReplyDialog(false);
        replyReset();
        // Refresh the page to show updated notes
        router.reload();
      },
      onError: () => {
        toast.error(t('Failed to send reply'));
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

  const StatusIcon = statusIcons[contact.status];

  return (
    <PageTemplate 
      title={t("Contact Details")} 
      url={`/landing-page/contacts/${contact.id}`}
      action={
        <Button
          variant="outline"
          onClick={() => router.get(route('landing-page.contacts.index'))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('Back to Contacts')}
        </Button>
      }
    >
      <SettingsSection
        title={t('Contact Details')}
        description={t('View and manage contact information')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('Contact Information')}</span>
                  <Badge className={`${statusColors[contact.status]} flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {t(contact.status.charAt(0).toUpperCase() + contact.status.slice(1))}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('Name')}</label>
                    <p className="text-lg font-semibold">{contact.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('Email')}</label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Subject')}</label>
                  <p className="text-gray-900">{contact.subject}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Message')}</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{contact.message}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Received')}</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{formatDate(contact.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder={t('Add notes about this contact...')}
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    rows={6}
                  />
                  <Button onClick={updateContact} disabled={processing}>
                    <Edit className="h-4 w-4 mr-2" />
                    {processing ? t('Updating...') : t('Update Notes')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Status')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={data.status} onValueChange={(value) => setData('status', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{t('New')}</SelectItem>
                    <SelectItem value="contacted">{t('Contacted')}</SelectItem>
                    <SelectItem value="qualified">{t('Qualified')}</SelectItem>
                    <SelectItem value="converted">{t('Converted')}</SelectItem>
                    <SelectItem value="closed">{t('Closed')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={updateContact} disabled={processing} className="w-full">
                  {processing ? t('Updating...') : t('Update Status')}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Quick Actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open(`mailto:${contact.email}?subject=Re: ${contact.subject}`)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('Send Email')}
                </Button>
                
                <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Send className="h-4 w-4 mr-2" />
                      {t('Quick Reply')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('Send Reply')}</DialogTitle>
                      <DialogDescription>
                        {t('Send a quick reply to')} {contact.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder={t('Type your reply message...')}
                        value={replyData.reply_message}
                        onChange={(e) => setReplyData('reply_message', e.target.value)}
                        rows={6}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowReplyDialog(false)}>
                        {t('Cancel')}
                      </Button>
                      <Button onClick={sendReply} disabled={replyProcessing}>
                        <Send className="h-4 w-4 mr-2" />
                        {replyProcessing ? t('Sending...') : t('Send Reply')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsSection>
      <Toaster />
    </PageTemplate>
  );
}