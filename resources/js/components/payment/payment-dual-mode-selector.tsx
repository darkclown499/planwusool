import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from 'react-i18next';

interface PaymentDualModeSelectorProps {
  value: 'offline' | 'api';
  onChange: (mode: 'offline' | 'api') => void;
  name: string;
  error?: string;
}

export function PaymentDualModeSelector({ value, onChange, name, error }: PaymentDualModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label>{t("Mode")}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="offline" id={`${name}_offline`} />
          <Label htmlFor={`${name}_offline`} className="font-normal">
            {t("Offline (Manual Instructions)")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="api" id={`${name}_api`} />
          <Label htmlFor={`${name}_api`} className="font-normal">
            {t("API Integration")}
          </Label>
        </div>
      </RadioGroup>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
