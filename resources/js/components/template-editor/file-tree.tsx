import { cn } from '@/lib/utils';
import { FileCode2, FileJson2, FileText, LockKeyhole } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface EditorFile {
    name: string;
    language: 'css' | 'javascript' | 'json';
    readOnly: boolean;
    description: string;
    content: string;
}

interface FileTreeProps {
    files: EditorFile[];
    activeName: string;
    dirtyFiles: Set<string>;
    onSelect: (name: string) => void;
}

function fileNameLabel(name: string): string {
    // Show a friendly label: remove the extension and dashes/underscores.
    const base = name.replace(/\.(css|js|json)$/i, '');
    return base.replace(/[-_]+/g, ' ');
}

function fileLanguageIcon(language: EditorFile['language'], readOnly: boolean) {
    if (readOnly) return <LockKeyhole className="h-4 w-4 text-muted-foreground/60" />;
    switch (language) {
        case 'json':
            return <FileJson2 className="h-4 w-4 text-yellow-600/80" />;
        case 'css':
            return <FileCode2 className="h-4 w-4 text-blue-600/80" />;
        default:
            return <FileCode2 className="h-4 w-4 text-emerald-600/80" />;
    }
}

function languageBadge(language: EditorFile['language']) {
    const map: Record<EditorFile['language'], string> = {
        css: 'bg-blue-50 text-blue-600',
        javascript: 'bg-emerald-50 text-emerald-600',
        json: 'bg-yellow-50 text-yellow-700',
    };
    return (
        <span className={cn('rounded px-1 py-0.5 text-[10px] font-semibold uppercase', map[language])}>
            {language}
        </span>
    );
}

export function FileTree({ files, activeName, dirtyFiles, onSelect }: FileTreeProps) {
    const { t } = useTranslation();

    const editable = files.filter((f) => !f.readOnly);
    const readOnlyFiles = files.filter((f) => f.readOnly);

    const renderFile = (file: EditorFile) => {
        const isActive = file.name === activeName;
        const isDirty = dirtyFiles.has(file.name);

        return (
            <button
                key={file.name}
                type="button"
                onClick={() => onSelect(file.name)}
                className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm transition',
                    isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                )}
                title={file.description}
            >
                {fileLanguageIcon(file.language, file.readOnly)}
                <span className="flex-1 truncate font-medium capitalize">{fileNameLabel(file.name)}</span>
                {isDirty && (
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', isActive ? 'bg-white' : 'bg-amber-500')} />
                )}
                {!isActive && languageBadge(file.language)}
            </button>
        );
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('Template Files')}
                </span>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {editable.map(renderFile)}
                </div>
                {readOnlyFiles.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                {t('Read Only')}
                            </span>
                            <span className="h-px flex-1 bg-gray-100" />
                        </div>
                        <div className="space-y-1">
                            {readOnlyFiles.map(renderFile)}
                        </div>
                    </>
                )}
            </div>
            <div className="border-t border-gray-100 px-3 py-2">
                <p className="text-[11px] leading-relaxed text-gray-400">
                    {t('Editable files apply only to this store and never change the shared template.')}
                </p>
            </div>
        </div>
    );
}

export default FileTree;