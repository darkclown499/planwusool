import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Store as StoreIcon, Loader2 } from 'lucide-react';

/**
 * Dedicated POS terminal / cashier sign-in screen.
 * Standalone on purpose: it renders NO merchant sidebar / dashboard chrome, so a
 * cashier authenticating here can never reach merchant settings or admin pages.
 * The PIN is entered here and sent over a normal CSRF-protected session form —
 * it is never placed in any URL.
 */
export default function PosTerminalLogin() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        store: '',
        username: '',
        pin: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('pos.terminal.login.store'));
    };

    return (
        <>
            <Head title={t('Terminal Login')} />
            <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
                <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-5 flex flex-col items-center gap-2 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <StoreIcon className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-lg font-bold">{t('POS Terminal')}</h1>
                        <p className="text-sm text-muted-foreground">{t('Cashier sign in')}</p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="store">{t('Store')}</Label>
                            <Input
                                id="store"
                                value={data.store}
                                onChange={(e) => setData('store', e.target.value)}
                                placeholder={t('Store slug or ID')}
                                autoComplete="off"
                                autoFocus
                            />
                            {errors.store && <p className="text-xs text-destructive">{errors.store}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="username">{t('Username')}</Label>
                            <Input
                                id="username"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                placeholder={t('Terminal username')}
                                autoComplete="username"
                                dir="ltr"
                            />
                            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="pin">{t('PIN')}</Label>
                            <Input
                                id="pin"
                                type="password"
                                inputMode="numeric"
                                value={data.pin}
                                onChange={(e) => setData('pin', e.target.value)}
                                placeholder="••••"
                                autoComplete="current-password"
                                dir="ltr"
                            />
                            {errors.pin && <p className="text-xs text-destructive">{errors.pin}</p>}
                        </div>

                        <Button className="w-full" size="lg" disabled={processing}>
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {t('Sign in')}
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}
