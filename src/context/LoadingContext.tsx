'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import LoadingOverlay from '@/components/LoadingOverlay';

interface LoadingContextType {
    setIsLoading: (isLoading: boolean, message?: string) => void;
    isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [loadingState, setLoadingState] = useState<{ active: boolean; message: string }>({
        active: false,
        message: 'Loading...',
    });

    const setIsLoading = (active: boolean, message: string = 'Loading...') => {
        setLoadingState({ active, message });
    };

    return (
        <LoadingContext.Provider value={{ setIsLoading, isLoading: loadingState.active }}>
            {children}
            {loadingState.active && <LoadingOverlay message={loadingState.message} />}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
