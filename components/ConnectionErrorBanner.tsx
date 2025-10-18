import React, { useState, useEffect, useCallback } from 'react';
import { WifiOffIcon, CloseIcon } from './Icons';
import { cn } from '../utils/helpers';

const AUTODISMISS_DELAY = 10000; // 10 seconds
const ANIMATION_DURATION = 300; // ms

interface ConnectionErrorBannerProps {
    isVisible: boolean;
    onDismiss: () => void;
}

export const ConnectionErrorBanner: React.FC<ConnectionErrorBannerProps> = ({ isVisible, onDismiss }) => {
    // This state controls the animation classes
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Animate in
            const timer = setTimeout(() => setIsShowing(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    const handleDismiss = useCallback(() => {
        // Animate out
        setIsShowing(false);
        // After animation, call the parent's dismiss handler to remove from DOM
        setTimeout(() => {
            onDismiss();
        }, ANIMATION_DURATION);
    }, [onDismiss]);
    
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(handleDismiss, AUTODISMISS_DELAY);
            return () => clearTimeout(timer);
        }
    }, [isVisible, handleDismiss]);

    if (!isVisible) {
        return null;
    }

    return (
        <div
            role="alert"
            className={cn(
                "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl p-4 rounded-xl shadow-lg transition-all ease-in-out",
                "bg-amber-50 dark:bg-amber-900/80 dark:backdrop-blur-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-500/30",
                `duration-300`,
                isShowing ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            )}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <WifiOffIcon className="h-5 w-5 flex-shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-justify hyphens-auto">
                        <span className="font-semibold">Falha na conexão:</span> Verifique sua internet e atualize a página. Se o problema persistir, o serviço pode estar temporariamente indisponível.
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Dispensar aviso"
                    className="p-1 -mr-1 rounded-full text-amber-900/70 dark:text-amber-300/70 hover:bg-amber-100 dark:hover:bg-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};