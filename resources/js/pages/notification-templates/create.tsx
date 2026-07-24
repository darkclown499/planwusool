import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Save, ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props {
  languages: string[];
}

export default function NotificationTemplatesCreate({ languages }: Props) {
  const { t } = useTranslation();
  
  const { data, setData, post, processing, errors } = useForm({
    type: 'sms',
    action: '',
    status: 'on',
    templates: languages.reduce((acc, lang) => {
      acc[lang] = { lang, content: '', variables: [] };
      return acc;
    }, {} as Record<string, { lang: string; content: string; variables: string[] }>)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      ...data,
      templates: Object.values(data.templates)
    };
    post(route('notification-templates.store'), formData);
  };

  const updateTemplate = (lang: string, field: string, value: string) => {
    setData('templates', {
      ...data.templates,
      [lang]: {
        ...data.templates[lang],
        [field]: value
      }
    });
  };

  return (
    <PageTemplate
      title={t('Create Notification Template')}
      url="/notification-templates/create"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Notification Templates'), href: route('notification-templates.index') },
        { title: t('Create Template') }
      ]}
      action={
        <Link href={route('notification-templates.index')}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('Back')}
          </Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('Template Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('Type')}</Label>
                <Select value={data.type} onValueChange={(value) => setData('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">{t('SMS')}</SelectItem>
                    <SelectItem value="email">{t('Email')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">{t('Action')}</Label>
                <Input
                  id="action"
                  value={data.action}
                  onChange={(e) => setData('action', e.target.value)}
                  placeholder={t('e.g., Order Created')}
                />
                {errors.action && <p className="text-sm text-red-600">{errors.action}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('Status')}</Label>
                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">{t('Active')}</SelectItem>
                    <SelectItem value="off">{t('Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-red-600">{errors.status}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Template Content')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={languages[0]} className="w-full">
              <TabsList className="grid grid-cols-8 lg:grid-cols-16 gap-1">
                {languages.map((lang) => (
                  <TabsTrigger key={lang} value={lang} className="text-xs">
                    {lang.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {languages.map((lang) => (
                <TabsContent key={lang} value={lang} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`content-${lang}`}>
                      {t('Content')} ({lang.toUpperCase()})
                    </Label>
                    <Textarea
                      id={`content-${lang}`}
                      value={data.templates[lang]?.content || ''}
                      onChange={(e) => updateTemplate(lang, 'content', e.target.value)}
                      placeholder={t('Enter template content...')}
                      rows={6}
                    />
                    <p className="text-sm text-gray-600">
                      {t('Use variables like {order_no}, {customer_name}, etc.')}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={processing}>
            <Save className="h-4 w-4 mr-2" />
            {processing ? t('Creating...') : t('Create Template')}
          </Button>
        </div>
      </form>
    </PageTemplate>
  );
}