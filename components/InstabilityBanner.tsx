import React, { useState, useEffect, useCallback } from 'react';
import { CheckIcon, CloseIcon } from './Icons';
import { cn } from '../utils/helpers';

const AUTODISMISS_DELAY = 8000; // 8 seconds
const ANIMATION_DURATION = 300; // ms

export const InstabilityBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Sempre exibe o banner ao carregar o aplicativo.
        setIsMounted(true);
        const timer = setTimeout(() => setIsVisible(true), 100); // Atraso para animação de entrada
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = useCallback(() => {
        // Apenas esconde o banner para a visualização atual.
        setIsVisible(false);
        setTimeout(() => {
            setIsMounted(false);
        }, ANIMATION_DURATION);
    }, []);
    
    useEffect(() => {
        if (isVisible) {
            // Dispensa automaticamente o banner após um tempo.
            const timer = setTimeout(handleDismiss, AUTODISMISS_DELAY);
            return () => clearTimeout(timer);
        }
    }, [isVisible, handleDismiss]);

    if (!isMounted) {
        return null;
    }

    return (
        <div
            role="alert"
            className={cn(
                "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl p-4 rounded-xl shadow-lg transition-all ease-in-out",
                "bg-emerald-50 dark:bg-emerald-900/80 dark:backdrop-blur-sm text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30",
                `duration-300`,
                isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            )}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <CheckIcon className="h-5 w-5 flex-shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-justify hyphens-auto">
                        <span className="font-semibold">Aviso:</span> A maior parte dos erros de instabilidade foi corrigida. Para qualquer outro erro que venha a acontecer, entre em contato pelo e-mail <strong className="font-semibold">suporte@buscarconcursos.com.br</strong>.
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Dispensar aviso"
                    className="p-1 -mr-1 rounded-full text-emerald-900/70 dark:text-emerald-300/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};