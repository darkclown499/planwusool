import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type LayoutPosition = 'left' | 'right';

type LayoutContextType = {
    position: LayoutPosition;
    updatePosition: (val: LayoutPosition) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const positionToDir = (pos: LayoutPosition): string => pos === 'right' ? 'rtl' : 'ltr';
const dirToPosition = (dir: string): LayoutPosition => dir === 'rtl' ? 'right' : 'left';

const syncDirectionToDOM = (pos: LayoutPosition) => {
    const dir = positionToDir(pos);
    document.documentElement.dir = dir;
    document.documentElement.setAttribute('dir', dir);
    localStorage.setItem('layoutDirection', dir);
    localStorage.setItem('layoutPosition', pos);
};

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
    const [position, setPosition] = useState<LayoutPosition>(() => {
        const savedPos = localStorage.getItem('layoutPosition') as LayoutPosition;
        if (savedPos === 'left' || savedPos === 'right') return savedPos;
        const savedDir = localStorage.getItem('layoutDirection');
        if (savedDir === 'rtl' || savedDir === 'ltr') return dirToPosition(savedDir);
        return 'left';
    });

    // Sync sidebar position with RTL/LTR direction via MutationObserver
    useEffect(() => {
        const handleDirectionChange = () => {
            const direction = document.documentElement.dir;
            if (direction === 'rtl' || direction === 'ltr') {
                const newPosition = dirToPosition(direction);
                setPosition(newPosition);
                localStorage.setItem('layoutPosition', newPosition);
                localStorage.setItem('layoutDirection', direction);
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

    const updatePosition = useCallback((val: LayoutPosition) => {
        setPosition(val);
        syncDirectionToDOM(val);
    }, []);

    return <LayoutContext.Provider value={{ position, updatePosition }}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error('useLayout must be used within LayoutProvider');
    return context;
};
