import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { cn } from '../utils/helpers';
import { useModal } from '../contexts/ModalContext';

const ANIMATION_DURATION = 300; // ms

interface CookieConsentBannerProps {
    isVisible: boolean;
    onAccept: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ isVisible, onAccept }) => {
    const { openModal } = useModal();
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => setIsShowing(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    const handleAccept = useCallback(() => {
        setIsShowing(false);
        setTimeout(() => {
            onAccept();
        }, ANIMATION_DURATION);
    }, [onAccept]);

    const handleLearnMore = () => {
        openModal('privacy', {});
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Aviso de Cookies"
            className={cn(
                "fixed bottom-0 left-0 right-0 z-40 p-4 transition-all ease-out",
                "bg-slate-100/80 dark:bg-gray-950/80 backdrop-blur-sm border-t border-slate-200 dark:border-gray-800 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)]",
                `duration-300`,
                isShowing ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            )}
        >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
                    Nós utilizamos o armazenamento local para salvar suas preferências e melhorar sua experiência. Ao continuar, você concorda com nosso uso de dados.
                    <button onClick={handleLearnMore} className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">
                        Saiba mais
                    </button>
                </p>
                <div className="flex-shrink-0">
                    <Button onClick={handleAccept} size="sm">
                        Entendi e aceito
                    </Button>
                </div>
            </div>
        </div>
    );
};