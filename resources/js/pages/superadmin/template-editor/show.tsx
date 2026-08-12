import { CodeEditor } from '@/components/code-editor';
import { PageTemplate, type PageAction } from '@/components/page-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/custom-toast';
import { FileTree, type EditorFile } from '@/components/template-editor/file-tree';
import { routeIfExists } from '@/utils/route-helpers';
import { Check, ExternalLink, RefreshCw, Save } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StoreInfo {
    id: number;
    name: string;
    slug: string;
    store_url: string;
    template_slug: string;
    template_name: string;
    owner?: { id: number; name: string; email: string } | null;
}

interface Props {
    store: StoreInfo;
    files: EditorFile[];
}

export default function TemplateEditorShow({ store, files = [] }: Props) {
    const { t } = useTranslation();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const storeId = store?.id;

    const [fileContents, setFileContents] = useState<Record<string, string>>(() =>
        Object.fromEntries(files.map((f) => [f.name, f.content]))
    );
    const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
    const [activeFile, setActiveFile] = useState<string>(files[0]?.name || '');
    const [savingFile, setSavingFile] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const active = files.find((f) => f.name === activeFile);
    const hasDirty = dirtyFiles.size > 0;

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (dirtyFiles.size > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirtyFiles]);

    const handleChange = (value: string) => {
        if (!activeFile) return;
        const original = files.find((f) => f.name === activeFile)?.content;
        setFileContents((prev) => ({ ...prev, [activeFile]: value }));
        setDirtyFiles((prev) => {
            const nd = new Set(prev);
            if (value === original) {
                nd.delete(activeFile);
            } else {
                nd.add(activeFile);
            }
            return nd;
        });
    };

    const handleSave = async (fileName: string) => {
        if (!storeId) return;
        setSavingFile(fileName);
        try {
            const csrfToken =
                document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch(route('template-editor.save', storeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({ file: fileName, content: fileContents[fileName] ?? '' }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || t('Failed to save file.'));
            }
            setDirtyFiles((prev) => {
                const nd = new Set(prev);
                nd.delete(fileName);
                return nd;
            });
            toast.success(data.message || t('Template file saved successfully.'));
            setReloadKey((k) => k + 1);
        } catch (err: any) {
            toast.error(err?.message || t('Failed to save file.'));
        } finally {
            setSavingFile(null);
        }
    };

    const handleRefreshPreview = () => {
        iframeRef.current?.contentWindow?.location.reload();
    };

    const pageActions: PageAction[] = useMemo(
        () => [
            {
                label: savingFile
                    ? t('Saving...')
                    : hasDirty
                      ? `${t('Save')} (${dirtyFiles.size})`
                      : t('Saved'),
                icon: savingFile ? null : hasDirty ? <Save className="me-1 h-4 w-4" /> : <Check className="me-1 h-4 w-4" />,
                variant: hasDirty ? 'default' : 'outline',
                onClick: () => activeFile && handleSave(activeFile),
                disabled: savingFile !== null || !activeFile,
            },
        ],
        [savingFile, hasDirty, dirtyFiles, activeFile, fileContents]
    );

    return (
        <PageTemplate
            title={`${store?.name || ''} — ${t('Template Editor')}`}
            url={`/template-editor/${storeId || ''}`}
            description={`${t('Template')}: ${store?.template_name || store?.template_slug || ''}`}
            stickyHeader
            backUrl={routeIfExists('template-editor.index') || undefined}
            breadcrumbs={[
                { title: t('Dashboard'), href: route('dashboard') },
                { title: t('Template Editor'), href: route('template-editor.index') },
                { title: store?.name || '' },
            ]}
            actions={pageActions}
            noPadding
        >
            <div className="flex flex-col gap-2 lg:flex-row">
                {/* File tree */}
                <div className="w-full shrink-0 lg:w-64">
                    <div className="h-[18rem] lg:h-full">
                        <FileTree
                            files={files}
                            activeName={activeFile}
                            dirtyFiles={dirtyFiles}
                            onSelect={setActiveFile}
                        />
                    </div>
                </div>

                {/* Editor */}
                <div className="min-w-0 flex-1">
                    <Card className="flex h-[30rem] flex-col lg:h-auto lg:min-h-[82vh]">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-gray-100 px-4 py-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="truncate font-mono text-sm font-semibold">
                                        {active?.name}
                                    </span>
                                    {active?.readOnly && (
                                        <Badge variant="outline">{t('Read Only')}</Badge>
                                    )}
                                    {dirtyFiles.has(activeFile) && (
                                        <Badge variant="secondary">{t('Unsaved')}</Badge>
                                    )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {active?.description}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefreshPreview}
                                >
                                    <RefreshCw className="h-3.5 w-3.5 me-1" />
                                    {t('Refresh Preview')}
                                </Button>
                                <a
                                    href={store?.store_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {t('Open Store')}
                                </a>
                            </div>
                        </div>
                        <CardContent className="min-h-0 flex-1 p-0">
                            {active && (
                                <div className="h-full">
                                    <CodeEditor
                                        value={fileContents[active.name] ?? ''}
                                        onChange={handleChange}
                                        language={active.language}
                                        readOnly={active.readOnly}
                                        height="100%"
                                        placeholder={t('Type code here...')}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Live preview */}
                <div className="w-full shrink-0 lg:w-[26rem] xl:w-[30rem]">
                    <Card className="flex h-[30rem] flex-col lg:h-auto lg:min-h-[82vh]">
                        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 px-4 py-3">
                            <span className="text-sm font-semibold">{t('Live Preview')}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReloadKey((k) => k + 1)}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <CardContent className="min-h-0 flex-1 p-2">
                            <div className="h-[28rem] overflow-hidden rounded-lg border border-gray-200 lg:h-[calc(82vh-4rem)]">
                                <iframe
                                    key={reloadKey}
                                    ref={iframeRef}
                                    src={`${store?.store_url}?v=${reloadKey}`}
                                    title={`${store?.name || 'Store'} preview`}
                                    className="h-full w-full bg-white"
                                    loading="lazy"
                                />
                            </div>
                            <p className="mt-2 px-1 text-[11px] text-gray-400">
                                {t('Preview reflects the store as a visitor sees it, including this store\'s own overrides.')}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTemplate>
    );
}