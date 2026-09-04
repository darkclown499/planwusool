import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useForm, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Power, KeyRound, Trash2, Link2, Copy, CheckCircle2 } from 'lucide-react';

interface TerminalRow {
    id: number;
    name: string;
    username: string;
    terminal_code: string;
    is_active: boolean;
    last_login_at: string | null;
}

export default function PosTerminals() {
    const { t } = useTranslation();
    const page = usePage().props as any;
    const terminals: TerminalRow[] = page.terminals || [];
    const store: { id: number; name: string; slug: string } = page.store || { id: 0, name: '', slug: '' };

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        username: '',
        pin: '',
    });

    const [editing, setEditing] = useState<TerminalRow | null>(null);
    const [resetPin, setResetPin] = useState('');
    const [editProcessing, setEditProcessing] = useState(false);
    const [editName, setEditName] = useState('');
    const [copied, setCopied] = useState<number | null>(null);

    const terminalLoginUrl = (term: TerminalRow) => {
        const url = route('pos.terminal.login', { store: store.id, username: term.username });
        return /^[a-z][a-z\d+\-.]*:\/\//i.test(url)
            ? url
            : `${window.location.origin}${url}`;
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('pos.terminals.store'), { onSuccess: () => reset() });
    };

    const toggleActive = (term: TerminalRow) => {
        router.post(route('pos.terminals.toggle', term.id), { active: !term.is_active });
    };

    const openEdit = (term: TerminalRow) => {
        setEditing(term);
        setEditName(term.name);
        setResetPin('');
    };

    const submitEdit = () => {
        if (!editing) return;
        setEditProcessing(true);
        router.put(route('pos.terminals.update', editing.id), {
            name: editName,
            pin: resetPin || null,
        }, {
            onFinish: () => { setEditProcessing(false); setEditing(null); },
        });
    };

    const remove = (term: TerminalRow) => {
        if (window.confirm(t('Delete this terminal?'))) {
            router.delete(route('pos.terminals.destroy', term.id));
        }
    };

    const copyLink = (term: TerminalRow) => {
        navigator.clipboard?.writeText(terminalLoginUrl(term)).then(() => setCopied(term.id));
        setTimeout(() => setCopied(null), 1500);
    };

    return (
        <PageTemplate
            title={t('POS Terminals')}
            description={t('Create and manage cashier terminals for this store')}
            url="/pos/terminals"
        >
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Create form */}
                <div className="rounded-lg border border-border bg-card p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Plus className="h-4 w-4" /> {t('New Terminal')}
                    </h2>
                    <form onSubmit={submit} className="space-y-3">
                        <div className="grid gap-1.5">
                            <Label>{t('Name / Label')}</Label>
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder={t('Front cashier')} />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label>{t('Username')}</Label>
                            <Input value={data.username} onChange={(e) => setData('username', e.target.value)} dir="ltr" placeholder="front-1" />
                            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label>{t('PIN')}</Label>
                            <Input value={data.pin} onChange={(e) => setData('pin', e.target.value)} type="password" inputMode="numeric" dir="ltr" placeholder="••••" />
                            {errors.pin && <p className="text-xs text-destructive">{errors.pin}</p>}
                            <p className="text-[11px] text-muted-foreground">
                                {t('Only the cashier sees this once. It is stored hashed and hidden after creation.')}
                            </p>
                        </div>
                        <Button className="w-full" disabled={processing}>
                            {t('Create Terminal')}
                        </Button>
                    </form>
                </div>

                {/* Terminal list */}
                <div className="space-y-3 lg:col-span-2">
                    {terminals.length === 0 ? (
                        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            {t('No terminals yet. Create one to let a cashier sign in on the register.')}
                        </p>
                    ) : (
                        terminals.map((term) => (
                            <div key={term.id} className="rounded-lg border border-border bg-card p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate font-semibold">{term.name}</p>
                                            <Badge variant={term.is_active ? 'default' : 'destructive'} className="text-[10px]">
                                                {term.is_active ? t('Active') : t('Inactive')}
                                            </Badge>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">@{term.username}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {term.last_login_at
                                                ? `${t('Last login')}: ${new Date(term.last_login_at).toLocaleString()}`
                                                : t('Never signed in')}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => copyLink(term)}>
                                            {copied === term.id ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                                            {t('Login link')}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openEdit(term)}>
                                            <KeyRound className="h-4 w-4" /> {t('Edit / PIN')}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => toggleActive(term)}>
                                            <Power className="h-4 w-4" /> {term.is_active ? t('Deactivate') : t('Activate')}
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => remove(term)}>
                                            <Trash2 className="h-4 w-4" /> {t('Delete')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Edit / reset PIN dialog */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Edit Terminal')}</DialogTitle>
                        <DialogDescription>{t('Rename or reset the PIN. Leave PIN blank to keep the current one.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-1.5">
                            <Label>{t('Name / Label')}</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>{t('New PIN (optional)')}</Label>
                            <Input value={resetPin} onChange={(e) => setResetPin(e.target.value)} type="password" inputMode="numeric" dir="ltr" placeholder="••••" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>{t('Close')}</Button>
                        <Button onClick={submitEdit} disabled={editProcessing}>{t('Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
