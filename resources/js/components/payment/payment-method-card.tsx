import { ReactNode, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings2, AlertCircle, Landmark, Banknote, CreditCard, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaymentMethodCardProps {
  title: string;
  icon?: ReactNode;
  methodKey?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: ReactNode;
  helpUrl?: string;
  helpText?: string;
}

function StripeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="4" fill="#635BFF" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">S</text>
    </svg>
  );
}

function PayPalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="4" fill="#003087" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">P</text>
    </svg>
  );
}

function getMethodIcon(methodKey: string): ReactNode {
  switch (methodKey) {
    case 'cod': return <Banknote className="h-6 w-6 text-muted-foreground" />;
    case 'bank': return <Landmark className="h-6 w-6 text-muted-foreground" />;
    case 'stripe': return <StripeIcon />;
    case 'paypal': return <PayPalIcon />;
    case 'whatsapp':
    case 'telegram': return <AlertCircle className="h-6 w-6 text-muted-foreground" />;
    default:
      // Local wallets / banks / crypto methods get a generic icon
      if (methodKey?.startsWith('usdt_')) {
        return <Wallet className="h-6 w-6 text-muted-foreground" />;
      }
      if (methodKey?.includes('_bank') || methodKey === 'bank') {
        return <Landmark className="h-6 w-6 text-muted-foreground" />;
      }
      return methodKey ? <Wallet className="h-6 w-6 text-muted-foreground" /> : undefined;
  }
}

export function PaymentMethodCard({
  title,
  icon,
  methodKey,
  enabled,
  onToggle,
  children,
  helpUrl,
  helpText
}: PaymentMethodCardProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const displayIcon = methodKey ? getMethodIcon(methodKey) : icon;

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {displayIcon || <CreditCard className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            <Badge
              variant={enabled ? 'success' : 'secondary'}
              className="mt-1 text-[10px]"
            >
              {enabled ? t('Active') : t('Inactive')}
            </Badge>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {/* Settings action (only when enabled) */}
      <div className="mt-3 flex items-center justify-end">
        {enabled && children && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {t('Settings')}
          </Button>
        )}
      </div>

      {/* Configuration drawer */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {displayIcon || <CreditCard className="h-5 w-5" />}
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {helpUrl && helpText && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {helpText}{' '}
                  <a
                    href={helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {t('Dashboard')}
                  </a>
                </AlertDescription>
              </Alert>
            )}
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}