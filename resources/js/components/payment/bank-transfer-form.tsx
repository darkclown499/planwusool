import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/custom-toast';
import { Copy, CheckCircle, Upload } from 'lucide-react';
import { router } from '@inertiajs/react';

interface BankTransferFormProps {
  planId: number;
  finalPrice: number;
  couponCode: string;
  billingCycle: string;
  bankDetails: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BankTransferForm({
  planId,
  finalPrice,
  couponCode,
  billingCycle,
  bankDetails,
  onSuccess,
  onCancel
}: BankTransferFormProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('Copied to clipboard'));
  };

  const handleConfirmPayment = () => {
    if (finalPrice > 0 && !receipt) {
      toast.error(t('Please upload your payment receipt'));
      return;
    }

    setProcessing(true);

    // Inertia automatically converts data to FormData if a File is present
    router.post(route('bank.payment'), {
      plan_id: planId,
      billing_cycle: billingCycle,
      coupon_code: couponCode,
      amount: finalPrice,
      receipt: receipt
    }, {
      onSuccess: () => {
        toast.success(t('Payment request submitted successfully'));
        onSuccess();
      },
      onError: () => {
        toast.error(t('Failed to submit payment request'));
      },
      onFinish: () => {
        setProcessing(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">{t('Bank Transfer Details')}</h3>
          <div className="space-y-3 text-sm">
            <div className="whitespace-pre-line">{bankDetails}</div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="font-medium">{t('Amount')}: ${finalPrice}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(finalPrice.toString())}
              >
                <Copy className="h-3 w-3 me-1" />
                {t('Copy')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Upload Field - Only show if price > 0 */}
      {finalPrice > 0 && (
        <div className="space-y-2">
          <Label htmlFor="receipt">{t('Payment Receipt')}</Label>
          <div className="flex flex-col gap-2">
            <Input
              id="receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Upload className="h-3 w-3" />
              {t('Upload image or PDF (Max 5MB)')}
            </p>
          </div>
        </div>
      )}

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">{t('Important Instructions')}</p>
              <ul className="space-y-1 text-xs">
                <li>• {t('Transfer the exact amount shown above')}</li>
                {finalPrice > 0 ? (
                  <>
                    <li>• {t('Upload a clear screenshot of your payment receipt')}</li>
                    <li>• {t('Your plan will be activated after payment verification')}</li>
                  </>
                ) : (
                  <li>• {t('Click confirm to activate your free plan immediately')}</li>
                )}
                <li>• {t('Verification may take 1-3 business days')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('Cancel')}
        </Button>
        <Button
          onClick={handleConfirmPayment}
          disabled={processing}
          className="flex-1"
        >
          {processing ? t('Processing...') : (finalPrice > 0 ? t('I have made the payment') : t('Confirm Activation'))}
        </Button>
      </div>
    </div>
  );
}