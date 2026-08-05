import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type LayoutPosition = 'left' | 'right';

type LayoutContextType = {
    position: LayoutPosition;
    updatePosition: (val: LayoutPosition) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const syncDirectionToDOM = () => {
    // Arabic-first: always right-to-left. Only touch the DOM/localStorage when
    // the value actually differs so observers never feed back into themselves.
    try {
        if (document.documentElement.getAttribute('dir') !== 'rtl') {
            document.documentElement.setAttribute('dir', 'rtl');
        }
        if (localStorage.getItem('layoutDirection') !== 'rtl') {
            localStorage.setItem('layoutDirection', 'rtl');
        }
        if (localStorage.getItem('layoutPosition') !== 'right') {
            localStorage.setItem('layoutPosition', 'right');
        }
    } catch {
        // Never let storage/dir issues take down the whole app.
        try {
            document.documentElement.setAttribute('dir', 'rtl');
        } catch {
            // Swallow — direction can't be enforced.
        }
    }
};

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
    const [position, setPosition] = useState<LayoutPosition>('right');

    // Keep the interface right-to-left. The observer re-asserts RTL whenever
    // anything else changes the <html dir> attribute, without writing the same
    // value back (which would retrigger the observer and loop forever).
    useEffect(() => {
        const handleDirectionChange = () => {
            setPosition((prev) => (prev === 'right' ? prev : 'right'));
            if (document.documentElement.getAttribute('dir') !== 'rtl') {
                syncDirectionToDOM();
            }
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

    const updatePosition = useCallback(() => {
        // Direction is locked to RTL (Arabic-first); the value is ignored.
        setPosition((prev) => (prev === 'right' ? prev : 'right'));
        syncDirectionToDOM();
    }, []);

    const value = useMemo(() => ({ position, updatePosition }), [position, updatePosition]);

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error('useLayout must be used within LayoutProvider');
    return context;
};
