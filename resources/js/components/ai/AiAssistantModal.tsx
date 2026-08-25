import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Copy, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { useStackedModal } from '@/hooks/useStackedModal';
import { useModalStack } from '@/contexts/ModalStackContext';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { FlagIcon } from '@/components/FlagIcon';
import languageData from '@/../../resources/lang/language.json';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate?: (content: string) => void;
  onInsert?: (content: string) => void;
  title?: string;
  placeholder?: string;
}

export function AiAssistantModal({
  isOpen,
  onClose,
  onGenerate,
  onInsert,
  title = 'AI Content Generator',
  placeholder = 'أدخل التوجيه هنا (مثال: صغ عنواناً إعلانياً لخصومات العيد 50% على المحافظ الجلدية).',
}: AiAssistantModalProps) {
  const { t } = useTranslation();
  const { modalStack } = useModalStack();
  const { modalId, zIndex } = useStackedModal('ai-assistant-modal', isOpen);

  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('ar');
  const [creativity, setCreativity] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState(150);
  const [numResults, setNumResults] = useState(1);
  const [copied, setCopied] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('Please enter a prompt'));
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.post('/api/ai/generate', {
        prompt,
        language,
        creativity: parseFloat(creativity as any) || 0.7,
        maxTokens: parseInt(String(maxTokens), 10) || 150,
      });
      const text = (res.data as any)?.text ?? (res.data as any)?.result ?? (res.data as any)?.content ?? '';
      setResult(text || '');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message;
      setError('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من إعداد API Key.');
      if (msg) toast.error(msg);
      else toast.error('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من إعداد API Key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = () => {
    if (!result) return;
    const cb = onInsert ?? onGenerate;
    cb?.(result);
    handleClose();
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(result);
      } else {
        const ta = document.createElement('textarea');
        ta.value = result;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      toast.success(t('Link copied to clipboard'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('Failed to copy text'));
    }
  };

  const handleClose = () => {
    setPrompt('');
    setResult('');
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/30 animate-in fade-in duration-200" style={{ zIndex: zIndex - 1 }} />
        <DialogPrimitive.Content
          asChild
          onEscapeKeyDown={(e) => e.stopPropagation()}
          onPointerDownOutside={(e) => {
            const target = e.target as Element;
            if (target.closest('[data-chatgpt-button]') || target.closest('[data-ai-assistant-button]')) e.preventDefault();
          }}
        >
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-auto"
            style={{ zIndex }}
            data-ai-assistant-modal
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <div
              ref={modalContainerRef}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 border relative max-h-[90vh] overflow-y-auto"
              style={{ zIndex: zIndex + 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <DialogPrimitive.Title className="text-lg font-semibold flex items-center gap-2 m-0 p-0 border-0">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    {t(title)}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                      <X className="h-5 w-5" />
                    </button>
                  </DialogPrimitive.Close>
                </div>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  مولّد النصوص الذكي لتسريع كتابة وصف المنتجات والعناوين الإعلانية.
                </DialogPrimitive.Description>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('Language')}</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ zIndex: zIndex + 10 }}>
                        {languageData.map((lang: any) => (
                          <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
                            <FlagIcon countryCode={lang.countryCode} svg style={{ width: '1em', height: '1em', marginRight: '8px' }} />
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>مستوى الإبداع</Label>
                    <Select value={creativity} onValueChange={setCreativity}>
                      <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ zIndex: zIndex + 10 }}>
                        <SelectItem value="0.2" className="cursor-pointer">دقيق 0.2</SelectItem>
                        <SelectItem value="0.7" className="cursor-pointer">متوازن 0.7</SelectItem>
                        <SelectItem value="1.0" className="cursor-pointer">إبداعي 1.0</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('Number of Results')}</Label>
                    <Input type="number" value={numResults} onChange={(e) => setNumResults(Number(e.target.value))} min={1} max={5} />
                  </div>
                  <div>
                    <Label>عدد الكلمات التقديري</Label>
                    <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} min={50} max={500} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ai-prompt">{t('Add Text')}</Label>
                  <Textarea
                    id="ai-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="أدخل التوجيه هنا (مثال: صغ عنواناً إعلانياً لخصومات العيد 50% على المحافظ الجلدية)."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full cursor-pointer">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      جاري التوليد...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 me-2" />
                      توليد
                    </>
                  )}
                </Button>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
                )}

                {result && (
                  <div className="space-y-2">
                    <Label>النص المولّد</Label>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <Textarea value={result} onChange={(e) => setResult(e.target.value)} rows={6} className="bg-white" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCopy} variant="outline" className="flex-1 cursor-pointer">
                        {copied ? <Check className="h-4 w-4 me-1" /> : <Copy className="h-4 w-4 me-1" />}
                        نسخ النص
                      </Button>
                      <Button onClick={handleInsert} className="flex-1 cursor-pointer">
                        استخدام النص
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default AiAssistantModal;
