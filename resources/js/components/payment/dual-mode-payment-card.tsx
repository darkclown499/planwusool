import { PaymentMethodCard } from '@/components/payment/payment-method-card';
import { PaymentInputField } from '@/components/payment/payment-input-field';
import { PaymentDualModeSelector } from '@/components/payment/payment-dual-mode-selector';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export interface LocalMethodData {
  is_enabled: boolean;
  mode: 'offline' | 'api';
  phone_number?: string;
  merchant_name?: string;
  instructions?: string;
  api_key?: string;
  secret_key?: string;
  merchant_id?: string;
  network?: string;
  wallet_address?: string;
  memo?: string;
}

interface DualModePaymentCardProps {
  title: string;
  methodKey: string;
  kind: 'local' | 'usdt';
  data: LocalMethodData;
  onToggle: (checked: boolean) => void;
  onModeChange: (mode: 'offline' | 'api') => void;
  onFieldChange: (field: string, value: string) => void;
  icon?: ReactNode;
  helpUrl?: string;
  helpText?: string;
  errors?: Record<string, unknown>;
}

export function DualModePaymentCard({
  title,
  methodKey,
  kind,
  data,
  onToggle,
  onModeChange,
  onFieldChange,
  icon,
  helpUrl,
  helpText,
  errors = {},
}: DualModePaymentCardProps) {
  const { t } = useTranslation();
  const mode = data.mode || 'offline';

  const fieldError = (field: string): string | undefined => {
    const value = errors[`${methodKey}_${field}`];
    return typeof value === 'string' ? value : undefined;
  };

  return (
    <PaymentMethodCard
      title={title}
      methodKey={methodKey}
      icon={icon}
      enabled={data.is_enabled}
      onToggle={onToggle}
      helpUrl={helpUrl}
      helpText={helpText}
    >
      <div className="space-y-4">
        <PaymentDualModeSelector
          value={mode}
          onChange={onModeChange}
          name={methodKey}
        />

        {mode === 'offline' ? (
          kind === 'usdt' ? (
            <div className="space-y-4">
              <PaymentInputField
                id={`${methodKey}_wallet_address`}
                label={t("Wallet Address")}
                value={data.wallet_address || ''}
                onChange={(value) => onFieldChange('wallet_address', value)}
                placeholder={t("USDT wallet address")}
                error={fieldError('wallet_address')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PaymentInputField
                  id={`${methodKey}_network`}
                  label={t("Network")}
                  value={data.network || ''}
                  onChange={(value) => onFieldChange('network', value)}
                  placeholder={t("e.g. TRC20, ERC20")}
                  error={fieldError('network')}
                />
                <PaymentInputField
                  id={`${methodKey}_memo`}
                  label={t("Memo / Tag (Optional)")}
                  value={data.memo || ''}
                  onChange={(value) => onFieldChange('memo', value)}
                  placeholder={t("Memo tag if required")}
                  error={fieldError('memo')}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PaymentInputField
                  id={`${methodKey}_phone_number`}
                  label={t("Phone Number")}
                  value={data.phone_number || ''}
                  onChange={(value) => onFieldChange('phone_number', value)}
                  placeholder={t("Payment phone number")}
                  error={fieldError('phone_number')}
                />
                <PaymentInputField
                  id={`${methodKey}_merchant_name`}
                  label={t("Merchant Name")}
                  value={data.merchant_name || ''}
                  onChange={(value) => onFieldChange('merchant_name', value)}
                  placeholder={t("Name shown to customers")}
                  error={fieldError('merchant_name')}
                />
              </div>
              <PaymentInputField
                id={`${methodKey}_instructions`}
                label={t("Payment Instructions")}
                value={data.instructions || ''}
                onChange={(value) => onFieldChange('instructions', value)}
                placeholder={t("Instructions shown to customers during checkout")}
                error={fieldError('instructions')}
              />
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PaymentInputField
                id={`${methodKey}_api_key`}
                label={t("API Key")}
                value={data.api_key || ''}
                onChange={(value) => onFieldChange('api_key', value)}
                placeholder={t("API Key")}
                isSecret
                error={fieldError('api_key')}
              />
              <PaymentInputField
                id={`${methodKey}_secret_key`}
                label={t("Secret Key")}
                value={data.secret_key || ''}
                onChange={(value) => onFieldChange('secret_key', value)}
                placeholder={t("Secret Key")}
                isSecret
                error={fieldError('secret_key')}
              />
            </div>
            <PaymentInputField
              id={`${methodKey}_merchant_id`}
              label={t("Merchant ID")}
              value={data.merchant_id || ''}
              onChange={(value) => onFieldChange('merchant_id', value)}
              placeholder={t("Merchant ID")}
              error={fieldError('merchant_id')}
            />
            <p className="text-xs text-muted-foreground">
              {t("API integration will be activated once the payment gateway provider is configured. Until then, orders placed with this method remain pending for manual verification.")}
            </p>
          </div>
        )}
      </div>
    </PaymentMethodCard>
  );
}
