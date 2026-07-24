import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';

interface ReferralSettingsProps {
  settings: any;
}

export default function ReferralSettings({ settings }: ReferralSettingsProps) {
  const { t } = useTranslation();


  const { data, setData, post, processing, errors, errors: rejectErrors } = useForm({
    is_enabled: settings.is_enabled,
    commission_percentage: settings.commission_percentage,
    threshold_amount: settings.threshold_amount,
    guidelines: settings.guidelines || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('referral.settings.update'), {
      onSuccess: () => {
        // Don't show success toast - let backend handle the message
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Referral Program Settings')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_enabled"
              checked={data.is_enabled}
              onCheckedChange={(checked) => setData('is_enabled', checked)}
            />
            <Label htmlFor="is_enabled">{t('Enable Referral Program')}</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commission_percentage" required>{t('Commission Percentage (%)')}</Label>
              <Input
                id="commission_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={data.commission_percentage}
                onChange={(e) => setData('commission_percentage', e.target.value)}
                aria-invalid={!!rejectErrors.commission_percentage}
              />
              <InputError message={errors.commission_percentage} />
            </div>

            <div>
              <Label htmlFor="threshold_amount" required>{t('Minimum Threshold Amount')}</Label>
              <Input
                id="threshold_amount"
                type="number"
                step="0.01"
                min="0"
                value={data.threshold_amount}
                onChange={(e) => setData('threshold_amount', e.target.value)}
                aria-invalid={!!rejectErrors.threshold_amount}
              />
              <InputError message={errors.threshold_amount} />
            </div>
          </div>

          <div>
            <Label htmlFor="guidelines">{t('Referral Guidelines')}</Label>
            <Textarea
              id="guidelines"
              value={data.guidelines}
              onChange={(e) => setData('guidelines', e.target.value)}
              placeholder={t('Enter referral program guidelines and terms...')}
              rows={6}
            />
            {errors.guidelines && (
              <p className="text-sm text-red-500">{errors.guidelines}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={processing}>
              {processing ? t('Saving...') : t('Save Settings')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}