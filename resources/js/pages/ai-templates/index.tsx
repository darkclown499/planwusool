import { router } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Bot,
  FileText,
  MessageSquare,
  Wand2,
  Type,
  ShoppingBag,
  ArrowRight,
  Settings2,
  PenLine,
} from 'lucide-react';

const templates = [
  { title: 'Product Descriptions', desc: 'Generate SEO-friendly product descriptions in seconds', icon: ShoppingBag, badge: 'Popular' },
  { title: 'Store Announcements', desc: 'Craft announcements and updates for your customers', icon: MessageSquare, badge: '' },
  { title: 'WhatsApp Messages', desc: 'AI-powered replies and broadcast messages for WhatsApp', icon: PenLine, badge: '' },
  { title: 'Email Campaigns', desc: 'Build engaging email content that converts visitors', icon: FileText, badge: '' },
  { title: 'Landing Page Copy', desc: 'Write headlines and sections for your landing pages', icon: Type, badge: '' },
  { title: 'Category Descriptions', desc: 'Describe product categories with clear marketing copy', icon: Wand2, badge: '' },
];

export default function AiTemplatesIndex() {
  const { t } = useTranslation();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('AI Templates') },
  ];

  return (
    <PageTemplate
      title={t('AI Templates')}
      url="/ai-templates"
      description={t('Boost your store content with AI-powered templates')}
      breadcrumbs={breadcrumbs}
      action={
        <Button onClick={() => router.visit(route('settings'))}>
          <Settings2 className="h-4 w-4 me-2" />
          {t('AI Settings')}
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="p-4 bg-background rounded-2xl shadow-sm">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{t('Create content with AI')}</h2>
                <p className="text-muted-foreground max-w-2xl">
                  {t('Use AI templates to write product descriptions, announcements, messages and more — directly in your store builder. Connect an OpenAI API key in settings to get started.')}
                </p>
              </div>
              <Button onClick={() => router.visit(route('settings'))}>
                <Bot className="h-4 w-4 me-2" />
                {t('Connect AI')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.title} className="group hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <template.icon className="h-6 w-6 text-primary" />
                  </div>
                  {template.badge && <Badge>{template.badge}</Badge>}
                </div>
                <CardTitle className="text-base mt-4">{t(template.title)}</CardTitle>
                <CardDescription>{t(template.desc)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="px-0 text-primary" onClick={() => router.visit(route('dashboard'))}>
                  {t('Use Template')}
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t('How it works')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3 p-4 border rounded-lg">
                <Bot className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">1. {t('Connect your AI provider')}</p>
                  <p className="text-sm text-muted-foreground">{t('Add your API key in the AI settings section')}</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 border rounded-lg">
                <PenLine className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">2. {t('Pick a template')}</p>
                  <p className="text-sm text-muted-foreground">{t('Choose from ready-made content templates')}</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 border rounded-lg">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">3. {t('Generate & publish')}</p>
                  <p className="text-sm text-muted-foreground">{t('Review the AI output and publish it to your store')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
