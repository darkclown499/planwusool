
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
import ReactCountryFlag from 'react-country-flag';
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
  placeholder = "Describe what you want to generate..."
}: ChatGptModalProps) {
  const { t } = useTranslation();
  const { modalStack } = useModalStack();
  const { modalId, zIndex } = useStackedModal('chatgpt-modal', isOpen);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [creativity, setCreativity] = useState('medium');
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
    try {
      const response = await fetch(route('chatgpt.generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          prompt,
          language,
          creativity,
          num_results: numResults,
          max_length: maxLength
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedContent(data.content);
      } else {
        toast.error(data.message || t('Failed to generate content'));
      }
    } catch (error) {
      toast.error(t('Error connecting to AI service'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUse = () => {
    if (generatedContent) {
      onGenerate(generatedContent);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedContent('');
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 border relative"
              style={{ zIndex: zIndex + 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <DialogPrimitive.Title className="text-lg font-semibold flex items-center gap-2 m-0 p-0 border-0">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  {t(title)}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close asChild>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer focus:outline-none"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('Language')}</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent container={modalContainerRef.current} style={{ zIndex: zIndex + 10 }}>
                        {languageData.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
                            <ReactCountryFlag
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
                    <Label>{t('AI Creativity')}</Label>
                    <Select value={creativity} onValueChange={setCreativity}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent container={modalContainerRef.current} style={{ zIndex: zIndex + 10 }}>
                        <SelectItem value="low" className="cursor-pointer">{t("Low")} (0.3)</SelectItem>
                        <SelectItem value="medium" className="cursor-pointer">{t("Medium")} (0.7)</SelectItem>
                        <SelectItem value="high" className="cursor-pointer">{t("High")} (0.9)</SelectItem>
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
                    <Label>{t('Max Result Length')}</Label>
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
                    placeholder={t(placeholder)}
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('Generating...')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('Generate')}
                    </>
                  )}
                </Button>

                {generatedContent && (
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
                          onClick={() => handleCopyLink(generatedContent)}
                          className="cursor-pointer"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {t('Copy Text')}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="generated-content"
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      onSelect={handleTextSelection}
                      rows={6}
                      className="mt-1"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button onClick={handleUse} className="flex-1 cursor-pointer">
                        {t('Use This Content')}
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