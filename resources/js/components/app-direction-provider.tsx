import { type ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { useLayout } from '@/contexts/LayoutContext';

export function AppDirectionProvider({ children }: { children: ReactNode }) {
    const { position } = useLayout();

    return (
        <DirectionProvider dir={position === 'right' ? 'rtl' : 'ltr'}>
            {children}
        </DirectionProvider>
    );
}
