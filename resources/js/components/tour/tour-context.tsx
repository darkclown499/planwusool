import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
    const [navigating, setNavigating] = useState<string | null>(null);
    const autoStartedRef = useRef(false);
    const navRetriesRef = useRef<Record<string, number>>({});

    const userType = user?.type;
    const currentStore = user?.current_store;

    const start = useCallback(
        (stepsArg?: TourStep[]) => {
            const tourSteps = stepsArg || getTourSteps(currentStore);
            if (tourSteps.length === 0) return;
            navRetriesRef.current = {};
            setSteps(tourSteps);
            setIndex(0);
            setActive(true);
            localStorage.setItem(SEEN_KEY, '1');
        },
        [currentStore],
    );

    const stop = useCallback(() => {
        setActive(false);
        localStorage.setItem(SEEN_KEY, '1');
    }, []);

    const next = useCallback(() => {
        if (index + 1 >= steps.length) {
            setActive(false);
            localStorage.setItem(SEEN_KEY, '1');
            return;
        }
        setIndex(index + 1);
    }, [index, steps.length]);

    const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

    useEffect(() => {
        if (autoStartedRef.current) return;
        if (userType !== 'company') return;
        if (typeof window === 'undefined') return;
        if (localStorage.getItem(SEEN_KEY)) return;
        autoStartedRef.current = true;
        const timer = setTimeout(() => start(), 3000);
        return () => clearTimeout(timer);
    }, [userType, start]);

    useEffect(() => {
        if (!active) return;
        const step = steps[index];
        if (!step) return;

        const targetPath = new URL(step.path, window.location.origin).pathname;
        if (window.location.pathname === targetPath) {
            navRetriesRef.current[targetPath] = 0;
            if (navigating !== null) setNavigating(null);
            return;
        }
        if (navigating !== null) return;

        const retries = navRetriesRef.current[targetPath] || 0;
        if (retries >= 2) {
            setActive(false);
            localStorage.setItem(SEEN_KEY, '1');
            return;
        }
        navRetriesRef.current[targetPath] = retries + 1;

        setNavigating(step.path);
        router.visit(step.path, {
            onFinish: () => setNavigating(null),
            onError: () => {
                setNavigating(null);
                setActive(false);
                localStorage.setItem(SEEN_KEY, '1');
            },
        });
    }, [active, index, steps, navigating]);

    const value = useMemo(
        () => ({ active, index, steps, start, stop, next, back }),
        [active, index, steps, start, stop, next, back],
    );

    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour(): TourContextType {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error('useTour must be used within a TourProvider');
    return ctx;
}
