import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Save, Globe, Info, Search, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { getImageUrl } from '@/utils/image-helper';
import MediaPicker from '@/components/MediaPicker';

interface SeoSettingsProps {
 settings?: Record<string, string>;
}

export default function SeoSettings({ settings = {} }: SeoSettingsProps) {
 const { t } = useTranslation();
 const pageProps = usePage().props as any;

 // Default settings
 const defaultSettings = {
 metaTitle: '',
 metaKeywords: '',
 metaDescription: '',
 metaImage: '',
 googleVerification: '',
 bingVerification: '',
 googleAnalyticsId: ''
 };

 // Combine settings from props and page props
 const settingsData = Object.keys(settings).length > 0
 ? settings
 : (pageProps.settings || {});

 // Initialize state with merged settings
 const [seoSettings, setSeoSettings] = useState(() => ({
 metaTitle: settingsData.metaTitle || defaultSettings.metaTitle,
 metaKeywords: settingsData.metaKeywords || defaultSettings.metaKeywords,
 metaDescription: settingsData.metaDescription || defaultSettings.metaDescription,
 metaImage: settingsData.metaImage || defaultSettings.metaImage,
 googleVerification: settingsData.googleVerification || defaultSettings.googleVerification,
 bingVerification: settingsData.bingVerification || defaultSettings.bingVerification,
 googleAnalyticsId: settingsData.googleAnalyticsId || defaultSettings.googleAnalyticsId
 }));

 const [isLoading, setIsLoading] = useState(false);

 // Update state when settings change
 useEffect(() => {
 if (pageProps.settings) {
 setSeoSettings(prev => ({
 ...prev,
 metaTitle: pageProps.settings.metaTitle || prev.metaTitle,
 metaKeywords: pageProps.settings.metaKeywords || prev.metaKeywords,
 metaDescription: pageProps.settings.metaDescription || prev.metaDescription,
 metaImage: pageProps.settings.metaImage || prev.metaImage,
 googleVerification: pageProps.settings.googleVerification || prev.googleVerification,
 bingVerification: pageProps.settings.bingVerification || prev.bingVerification,
 googleAnalyticsId: pageProps.settings.googleAnalyticsId || prev.googleAnalyticsId
 }));
 }
 }, [pageProps.settings]);

 // Handle SEO settings form changes
 const handleSeoSettingsChange = (field: string, value: string) => {
 setSeoSettings(prev => ({
 ...prev,
 [field]: value
 }));
 };

 // Handle media picker selection
 const handleMediaSelect = (url: string) => {
 setSeoSettings(prev => ({
 ...prev,
 metaImage: url
 }));
 };

 // Remove uploaded image
 const removeImage = () => {
 setSeoSettings(prev => ({
 ...prev,
 metaImage: ''
 }));
 };

 const getDescriptionStatus = () => {
 const length = seoSettings.metaDescription.length;
 if (length === 0) return { status: 'empty', color: 'text-muted-foreground', icon: AlertCircle };
 if (length < 120) return { status: 'short', color: 'text-orange-500', icon: AlertCircle };
 if (length <= 160) return { status: 'good', color: 'text-green-500', icon: CheckCircle2 };
 return { status: 'long', color: 'text-red-500', icon: AlertCircle };
 };

 const keywordCount = seoSettings.metaKeywords.split(',').filter((k: any) => k.trim().length > 0).length;

 // Handle SEO settings form submission
 const submitSeoSettings = (e: React.FormEvent) => {
 e.preventDefault();

 // Client-side validation
 if (!seoSettings.metaDescription.trim()) {
 toast.error(t('Meta Description is required'));
 return;
 }

 setIsLoading(true);

 // Submit to backend using Inertia
 router.post(route('settings.seo.update'), seoSettings, {
 preserveScroll: true,
 onSuccess: () => {
 setIsLoading(false);
 },
 onError: (errors: any) => {
 setIsLoading(false);
 const errorMessage = errors.error || Object.values(errors).join(', ') || t('Failed to update SEO settings');
 toast.error(errorMessage);
 }
 });
 };

 return (
 <SettingsSection
 title={t("SEO Settings")}
 description={t("Configure SEO settings to improve your website's search engine visibility")}
 action={
 <Button onClick={submitSeoSettings} disabled={isLoading} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
 <Save className="h-4 w-4 me-2" />
 {isLoading ? t('Saving...') : t("Save Changes")}
 </Button>
 }
 >
 <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-8 items-start py-2">
 {/* Left Form Column */}
 <div className="space-y-6">
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <Label htmlFor="metaTitle" className="font-semibold text-gray-800">{t("Meta Title")}</Label>
 <span className={`text-sm ${seoSettings.metaTitle.length > 60 ? 'text-red-500' : 'text-emerald-500'}`}>
 {seoSettings.metaTitle.length}/60
 </span>
 </div>
 <Input
 id="metaTitle"
 type="text"
 value={seoSettings.metaTitle}
 onChange={(e) => handleSeoSettingsChange('metaTitle', e.target.value)}
 placeholder={t("Enter meta title here")}
 className="focus-visible:ring-emerald-500"
 maxLength={60}
 />
 <p className="text-xs text-gray-500 mt-1">
 {t("Appears as the clickable headline in search results")}
 </p>
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <Label htmlFor="metaDescription" required className="font-semibold text-gray-800">{t("Meta Description")}</Label>
 <div className="flex items-center gap-1">
 {(() => {
 const { color, icon: Icon } = getDescriptionStatus();
 return (
 <>
 <Icon className={`h-4 w-4 ${color}`} />
 <span className={`text-sm ${color}`}>
 {seoSettings.metaDescription.length}/160
 </span>
 </>
 );
 })()}
 </div>
 </div>
 <Textarea
 id="metaDescription"
 value={seoSettings.metaDescription}
 onChange={(e) => handleSeoSettingsChange('metaDescription', e.target.value)}
 placeholder={t("Enter a brief description for search engines...")}
 rows={4}
 required
 maxLength={160}
 className="resize-none focus-visible:ring-emerald-500"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t("Appears below the title in search results. Optimal length: 120-160 characters")}
 </p>
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <Label htmlFor="metaKeywords" required className="font-semibold text-gray-800">{t("Meta Keywords")}</Label>
 <span className="text-sm font-medium text-gray-700">{keywordCount} {t("keywords")}</span>
 </div>
 <Input
 id="metaKeywords"
 type="text"
 value={seoSettings.metaKeywords}
 onChange={(e) => handleSeoSettingsChange('metaKeywords', e.target.value)}
 placeholder={t("workdo, dashboard, admin, panel, management")}
 required
 className="focus-visible:ring-emerald-500"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t("Comma-separated keywords relevant to your content")}
 </p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="metaImage" required className="font-semibold text-gray-800">{t("Meta Image")}</Label>
 <div className="flex gap-2">
 <div className="flex-1">
 <MediaPicker
 value={seoSettings.metaImage}
 onChange={handleMediaSelect}
 placeholder={t('Select image for social media sharing...')}
 showPreview={false}
 />
 </div>
 </div>
 <p className="text-xs text-gray-500 mt-1">
 {t("Image displayed when sharing on social media. Recommended: 1200x630px")}
 </p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="googleVerification" className="font-semibold text-gray-800">{t("Google Search Console Verification")}</Label>
 <Input
 id="googleVerification"
 type="text"
 value={seoSettings.googleVerification}
 onChange={(e) => handleSeoSettingsChange('googleVerification', e.target.value)}
 placeholder={t("Paste your Google site verification code (content value)")}
 className="focus-visible:ring-emerald-500"
 dir="ltr"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t("Found in Google Search Console > Settings > Ownership verification. Paste the content value only.")}
 </p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="bingVerification" className="font-semibold text-gray-800">{t("Bing Webmaster Verification")}</Label>
 <Input
 id="bingVerification"
 type="text"
 value={seoSettings.bingVerification}
 onChange={(e) => handleSeoSettingsChange('bingVerification', e.target.value)}
 placeholder={t("Paste your Bing site verification code")}
 className="focus-visible:ring-emerald-500"
 dir="ltr"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t("Found in Bing Webmaster Tools > Configure my site. Paste the msvalidate.01 content value.")}
 </p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="googleAnalyticsId" className="font-semibold text-gray-800">{t("Google Analytics ID")}</Label>
 <Input
 id="googleAnalyticsId"
 type="text"
 value={seoSettings.googleAnalyticsId}
 onChange={(e) => handleSeoSettingsChange('googleAnalyticsId', e.target.value)}
 placeholder={t("G-XXXXXXX or UA-XXXXXXXX-X")}
 className="focus-visible:ring-emerald-500"
 dir="ltr"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t("Enables Google Analytics 4 tracking across the public site.")}
 </p>
 </div>
 </div>

 {/* Right Preview Column */}
 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm h-fit space-y-4">
 <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
 <Globe className="h-5 w-5 text-emerald-600" />
 <h3 className="text-base font-bold text-gray-800">{t("SEO Preview")}</h3>
 </div>

 {/* Google Search Preview */}
 <div className="bg-white border border-slate-200 rounded-lg p-3">
 <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
 <span>example.com</span>
 </div>
 <h4 className="text-[15px] text-[#1a0dab] font-medium leading-snug cursor-pointer hover:underline mb-1 truncate">
 {seoSettings.metaTitle || t('Your Meta Title Here')}
 </h4>
 <p className="text-xs text-[#4d5156] leading-snug line-clamp-2">
 {seoSettings.metaDescription || t('Your meta description will appear here. It should be concise and relevant.')}
 </p>
 </div>

 {/* Social Media Preview */}
 <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
 <h5 className="text-[11px] font-medium text-gray-500 px-3 py-1 bg-slate-100/50 border-b border-slate-200 tracking-wider uppercase">
 {t("Social Media Preview")}
 </h5>
 <div className="w-full bg-slate-100 aspect-[1.91/1] flex items-center justify-center relative overflow-hidden border-b border-slate-200">
 {seoSettings.metaImage ? (
 <img
 src={getImageUrl(seoSettings.metaImage)}
 alt="Preview"
 className="w-full h-full object-cover"
 onError={(e) => { e.currentTarget.src = ''; }}
 />
 ) : (
 <div className="text-gray-400 flex flex-col items-center">
 <Globe className="h-8 w-8 mb-1 opacity-20" />
 <span className="text-[10px] uppercase font-bold tracking-tighter">{t("No image")}</span>
 </div>
 )}
 </div>
 <div className="p-2.5 bg-[#f2f3f5]">
 <h4 className="text-sm font-semibold text-gray-900 leading-tight mb-0.5 truncate">
 {seoSettings.metaTitle || t('Social Media Title Preview')}
 </h4>
 <p className="text-[13px] text-gray-600 leading-snug line-clamp-1">
 {seoSettings.metaDescription || t('Social media description preview goes here...')}
 </p>
 </div>
 </div>

 {/* SEO Tips */}
 <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
 <h5 className="text-xs font-semibold text-blue-900 flex items-center mb-1.5 uppercase tracking-wider">
 <Info className="h-3.5 w-3.5 me-1.5" /> {t("SEO Tips")}
 </h5>
 <ul className="text-[11px] text-blue-800 space-y-1.5 list-none ps-0">
 <li className="flex items-start gap-2">
 <div className="mt-1 h-1 w-1 rounded-full bg-blue-400 flex-shrink-0" />
 <span><span className="font-bold">{t("Title:")}</span> {t("50-60 characters optimal")}</span>
 </li>
 <li className="flex items-start gap-2">
 <div className="mt-1 h-1 w-1 rounded-full bg-blue-400 flex-shrink-0" />
 <span><span className="font-bold">{t("Description:")}</span> {t("150-160 characters")}</span>
 </li>
 <li className="flex items-start gap-2">
 <div className="mt-1 h-1 w-1 rounded-full bg-blue-400 flex-shrink-0" />
 <span>{t("Include target keywords early")}</span>
 </li>
 <li className="flex items-start gap-2">
 <div className="mt-1 h-1 w-1 rounded-full bg-blue-400 flex-shrink-0" />
 <span><span className="font-bold">{t("Image:")}</span> {t("1200x630px works well")}</span>
 </li>
 </ul>
 </div>
 </div>
 </div>
 </SettingsSection>
 );
}