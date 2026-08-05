import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type LayoutPosition = 'left' | 'right';

type LayoutContextType = {
    position: LayoutPosition;
    updatePosition: (val: LayoutPosition) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const syncDirectionToDOM = () => {
    // Arabic-first: always right-to-left. Saved values must never flip it.
    try {
        document.documentElement.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        localStorage.setItem('layoutDirection', 'rtl');
        localStorage.setItem('layoutPosition', 'right');
    } catch (e) {
        // Never let storage/dir issues take down the whole app.
        try {
            document.documentElement.setAttribute('dir', 'rtl');
        } catch (e2) {}
    }
};

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
    const [position, setPosition] = useState<LayoutPosition>('right');

    // Keep the interface right-to-left. The observer re-asserts RTL whenever
    // anything else changes the <html dir> attribute.
    useEffect(() => {
        const handleDirectionChange = () => {
            setPosition('right');
            // Re-assert the actual direction on the document. Previously this
            // only updated React state, so any code that set dir="ltr" was
            // never reverted and the page stayed LTR until a full reload.
            syncDirectionToDOM();
        };

        handleDirectionChange();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'dir') {
                    handleDirectionChange();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['dir']
        });

        return () => observer.disconnect();
    }, []);

    const updatePosition = useCallback((_val: LayoutPosition) => {
        // Direction is locked to RTL (Arabic-first); the value is ignored.
        setPosition('right');
        syncDirectionToDOM();
    }, []);

    return <LayoutContext.Provider value={{ position, updatePosition }}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error('useLayout must be used within LayoutProvider');
    return context;
};
