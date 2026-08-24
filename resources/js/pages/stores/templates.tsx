import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

interface Props {
    store: any;
}

/**
 * Legacy /stores/{id}/templates gallery.
 *
 * The template selection UI is now consolidated inside the Designer
 * (`/stores/{id}/designer?tab=templates`) via the shared StoreTemplatesGrid
 * component. Visiting the old route auto-redirects to the designer with the
 * templates tab pre-selected — no duplicated UI or code.
 *
 * Server-side (StoreDesignerController::templates) also issues a 302 to the
 * same URL so direct browser navigations / hard reloads never render this
 * component; this client-side fallback covers Inertia SPA visits.
 */
export default function StoreThemesGallery({ store }: Props) {
    useEffect(() => {
        router.visit(`/stores/${store.id}/designer?tab=templates`, { replace: true });
    }, [store.id]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            جارٍ تحويلك إلى معرض القوالب…
        </div>
    );
}
