import { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Landmark, Banknote } from 'lucide-react';
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
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect width="24" height="24" rx="4" fill="#635BFF" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">S</text>
    </svg>
  );
}

function PayPalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect width="24" height="24" rx="4" fill="#003087" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">P</text>
    </svg>
  );
}

function getMethodIcon(methodKey: string): ReactNode {
  switch (methodKey) {
    case 'cod': return <Banknote className="h-5 w-5" />;
    case 'bank': return <Landmark className="h-5 w-5" />;
    case 'stripe': return <StripeIcon />;
    case 'paypal': return <PayPalIcon />;
    default: return null;
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
  const displayIcon = methodKey ? getMethodIcon(methodKey) : icon;

  return (
    <div className="border rounded-lg" dir="rtl">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {displayIcon}
          <span className="font-medium">{title}</span>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="p-4 space-y-4">
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
                  {t("Dashboard")}
                </a>
              </AlertDescription>
            </Alert>
          )}
          {children}
        </div>
      )}
    </div>
  );
}