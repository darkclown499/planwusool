import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { getTourSteps, type TourStep } from './tour-definitions';

const SEEN_KEY = 'wusool_tour_seen';

interface TourUser {
    type?: string;
    current_store?: number | null;
}

interface TourContextType {
    active: boolean;
    index: number;
    steps: TourStep[];
    start: (steps?: TourStep[]) => void;
    stop: () => void;
    next: () => void;
    back: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children, user }: { children: ReactNode; user?: TourUser }) {
    const [active, setActive] = useState(false);
    const [index, setIndex] = useState(0);
    const [steps, setSteps] = useState<TourStep[]>([]);
    const autoStartedRef = useRef(false);

    const start = useCallback(
        (stepsArg?: TourStep[]) => {
            const tourSteps = stepsArg || getTourSteps(user?.current_store);
            if (tourSteps.length === 0) return;
            setSteps(tourSteps);
            setIndex(0);
            setActive(true);
            localStorage.setItem(SEEN_KEY, '1');
        },
        [user?.current_store],
    );

    const stop = useCallback(() => {
        setActive(false);
        localStorage.setItem(SEEN_KEY, '1');
    }, []);

    const next = useCallback(() => {
        setIndex((i) => {
            if (i + 1 >= steps.length) {
                setActive(false);
                localStorage.setItem(SEEN_KEY, '1');
                return i;
            }
            return i + 1;
        });
    }, [steps.length]);

    const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

    useEffect(() => {
        if (autoStartedRef.current) return;
        if (user?.type !== 'company') return;
        if (typeof window === 'undefined') return;
        if (localStorage.getItem(SEEN_KEY)) return;
        autoStartedRef.current = true;
        const timer = setTimeout(() => start(), 3000);
        return () => clearTimeout(timer);
    }, [user, start]);

    useEffect(() => {
        if (!active) return;
        const step = steps[index];
        if (!step) return;
        const targetPath = new URL(step.path, window.location.origin).pathname;
        if (window.location.pathname !== targetPath) {
            router.visit(step.path, {
                preserveScroll: true,
                onError: () => {
                    // Keep the tour alive so the user can still navigate it.
                },
            });
        }
    }, [active, index, steps]);

    return (
        <TourContext.Provider value={{ active, index, steps, start, stop, next, back }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour(): TourContextType {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error('useTour must be used within a TourProvider');
    return ctx;
}
