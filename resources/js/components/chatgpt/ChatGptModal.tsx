
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';
import { Loader2, Sparkles, Copy, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { useStackedModal } from '@/hooks/useStackedModal';
import { useModalStack } from '@/contexts/ModalStackContext';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { FlagIcon } from '@/components/FlagIcon';
import languageData from '@/../../resources/lang/language.json';

interface ChatGptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (content: string) => void;
  title?: string;
  placeholder?: string;
}

export function ChatGptModal({
  isOpen,
  onClose,
  onGenerate,
  title = "AI Content Generator",
  placeholder = "أدخل التوجيه هنا (مثال: صغ عنواناً إعلانياً لخصومات العيد 50% على المحافظ الجلدية)."
}: ChatGptModalProps) {
  const { t } = useTranslation();
  const { modalStack } = useModalStack();
  const { modalId, zIndex } = useStackedModal('chatgpt-modal', isOpen);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  // Spec aliases
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('ar');
  const [creativity, setCreativity] = useState('0.7');
  const [numResults, setNumResults] = useState(1);
  const [maxLength, setMaxLength] = useState(150);
  const [selectedText, setSelectedText] = useState('');
  const [copied, setCopied] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('Please enter a prompt'));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Prefer new Gemini endpoint; fallback to legacy chatgpt endpoint if not available
      const aiRoute = (() => {
        try { return route('ai.generate'); } catch { return null; }
      })();
      const legacyRoute = (() => {
        try { return route('chatgpt.generate'); } catch { return null; }
      })();
      const endpoint = aiRoute || legacyRoute || '/api/ai/generate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          language,
          creativity: parseFloat(creativity as any) || 0.7,
          maxTokens: parseInt(String(maxLength), 10) || 150,
          // legacy aliases for backward compat
          max_length: parseInt(String(maxLength), 10) || 150,
          max_tokens: parseInt(String(maxLength), 10) || 150,
          num_results: numResults,
        })
      });

      const data = await response.json();

      if (response.ok && (data.text || data.result || data.content || data.success)) {
        const txt = (data.text ?? data.result ?? data.content ?? '') as string;
        setGeneratedContent(txt);
        setResult(txt);
      } else {
        const msg = data.message || t('Failed to generate content');
        setError('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من إعداد API Key.');
        toast.error(msg);
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من إعداد API Key.');
      toast.error(t('Error connecting to AI service'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUse = () => {
    const text = generatedContent || result;
    if (text) {
      onGenerate(text);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedContent('');
    setResult('');
    setError(null);
    setSelectedText('');
    setCopied(false);
    onClose();
  };

  const handleCopyLink = (text: string) => {
    const copyToClipboard = (text: string) => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise<void>((resolve, reject) => {
          if (document.execCommand('copy')) {
            textArea.remove();
            resolve();
          } else {
            textArea.remove();
            reject(new Error('Copy failed'));
          }
        });
      }
    };
    copyToClipboard(text)
      .then(() => {
        toast.success(t('Link copied to clipboard'));
      })
      .catch(() => {
        toast.error(t('Failed to copy text'));
      });
  };

  const handleTextSelection = () => {
    const textarea = document.getElementById('generated-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end);
      setSelectedText(selected);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/30 animate-in fade-in duration-200"
          style={{ zIndex: zIndex - 1 }}
        />
        <DialogPrimitive.Content
          asChild
          onEscapeKeyDown={(e) => {
            // By calling stopPropagation, we ensure that only the top-most Radix layer 
            // handles this Escape press.
            e.stopPropagation();
          }}
          onPointerDownOutside={(e) => {
            // Allow clicking the ChatGPT trigger button even when modal is open
            const target = e.target as Element;
            if (target.closest('[data-chatgpt-button]')) {
              e.preventDefault();
            }
          }}
        >
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-auto"
            style={{ zIndex }}
            data-chatgpt-modal
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
          >
            <div
              ref={modalContainerRef}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 border relative"
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
                    <button
                      onClick={handleClose}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer focus:outline-none"
                    >
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
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ zIndex: zIndex + 10 }}>
                        {languageData.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
                            <FlagIcon
                              countryCode={lang.countryCode}
                              svg
                              style={{ width: '1em', height: '1em', marginRight: '8px' }}
                            />
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>مستوى الإبداع</Label>
                    <Select value={creativity} onValueChange={setCreativity}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Input
                      type="number"
                      value={numResults}
                      onChange={(e) => setNumResults(Number(e.target.value))}
                      min={1}
                      max={5}
                    />
                  </div>
                  <div>
                    <Label>عدد الكلمات التقديري</Label>
                    <Input
                      type="number"
                      value={maxLength}
                      onChange={(e) => setMaxLength(Number(e.target.value))}
                      min={50}
                      max={500}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="prompt">{t('Add Text')}</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="أدخل التوجيه هنا (مثال: صغ عنواناً إعلانياً لخصومات العيد 50% على المحافظ الجلدية)."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      جارٍ التوليد...
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

                {(generatedContent || result) && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="generated">{t('Output Text')}</Label>
                      <div className="flex gap-2">
                        {selectedText && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(selectedText)}
                            className="cursor-pointer"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {t('Copy Selected')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(generatedContent || result)}
                          className="cursor-pointer"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          نسخ النص
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="generated-content"
                      value={generatedContent || result}
                      onChange={(e) => { setGeneratedContent(e.target.value); setResult(e.target.value); }}
                      onSelect={handleTextSelection}
                      rows={6}
                      className="mt-1"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button onClick={handleUse} className="flex-1 cursor-pointer">
                        استخدام النص
                      </Button>
                      <Button variant="outline" onClick={handleGenerate} disabled={isLoading} className="cursor-pointer">
                        {t('Regenerate')}
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