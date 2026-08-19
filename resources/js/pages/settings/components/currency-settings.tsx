import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Save, DollarSign } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';

interface CurrencyProps {
    id: number;
    name: string;
    code: string;
    symbol: string;
    description?: string;
    is_default: boolean;
}

const CURRENCY_LABELS: Record<string, string> = {
    ILS: 'شيكل أردني/فلسطيني',
    USD: 'دولار أمريكي',
    JOD: 'دينار أردني',
    EUR: 'يورو',
    GBP: 'جنيه إسترليني',
    AED: 'درهم إماراتي',
    SAR: 'ريال سعودي',
    EGP: 'جنيه مصري',
    KWD: 'دينار كويتي',
    QAR: 'ريال قطري',
    TRY: 'ليرة تركية',
    MAD: 'درهم مغربي',
    CAD: 'دولار كندي',
    AUD: 'دولار أسترالي',
    CNY: 'يوان صيني',
    INR: 'روبية هندية',
};

export default function CurrencySettings() {
    const { t } = useTranslation();
    const { currencies = [], systemSettings = {} } = usePage().props as any;

    const [defaultCurrency, setDefaultCurrency] = useState(systemSettings.defaultCurrency || 'ILS');
    const [currencyName, setCurrencyName] = useState('');

    useEffect(() => {
        if (currencies && currencies.length > 0) {
            const selected = currencies.find((c: CurrencyProps) => c.code === defaultCurrency);
            if (selected) {
                setCurrencyName(selected.name);
            }
        }
    }, [currencies, defaultCurrency]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.loading(t('Saving currency settings...'));

        router.post(route('settings.currency.update'), {
            defaultCurrency,
            decimalFormat: '2',
            decimalSeparator: '.',
            thousandsSeparator: ',',
            floatNumber: true,
            currencySymbolSpace: false,
            currencySymbolPosition: 'after',
        }, {
            preserveScroll: true,
            onSuccess: () => toast.dismiss(),
            onError: (errors: any) => {
                toast.dismiss();
                const msg = errors.error || Object.values(errors).join(', ') || t('Failed to update currency settings');
                toast.error(msg);
            }
        });
    };

    return (
        <SettingsSection
            title={t("Currency Settings")}
            description={t("Configure how currency values are displayed throughout the application")}
            action={
                <Button type="submit" form="currency-settings-form" size="sm">
                    <Save className="h-4 w-4 ms-2" />
                    {t("Save Changes")}
                </Button>
            }
        >
            <form id="currency-settings-form" onSubmit={handleSubmit} dir="rtl">
                <div className="space-y-3 text-start">
                    <Label htmlFor="defaultCurrency" className="font-medium">{t("Default Currency")}</Label>
                    <Select value={defaultCurrency} onValueChange={setDefaultCurrency} dir="rtl">
                        <SelectTrigger>
                            <SelectValue placeholder={t("Select currency")} />
                        </SelectTrigger>
                        <SelectContent>
                            <div className="max-h-[300px] overflow-y-auto">
                                {currencies && currencies.length > 0 ? (
                                    currencies.map((currency: CurrencyProps) => (
                                        <SelectItem key={currency.id} value={currency.code}>
                                            <div className="flex items-center gap-2">
                                                <span className="flex-shrink-0">{CURRENCY_LABELS[currency.code] || currency.name}</span>
                                                <span dir="ltr" className="text-xs text-muted-foreground">
                                                    ({currency.code} {currency.symbol})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-center text-muted-foreground">
                                        {t("No currencies found")}
                                    </div>
                                )}
                            </div>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">العملة الأساسية المستخدمة لتسعير المنتجات وإصدار الفواتير داخل المتجر.</p>
                </div>
            </form>
        </SettingsSection>
    );
}