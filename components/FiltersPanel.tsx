import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CloseIcon } from './Icons';

export const FiltersPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Atraso para habilitar transições para evitar flicker na montagem inicial
        const timer = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    useFocusTrap(isOpen, panelRef, onClose);
    
    const transitionClasses = isMounted ? 'transition-transform duration-300 ease-in-out' : '';
    const transformClasses = isOpen
      ? 'translate-y-0 sm:translate-x-0'
      : 'translate-y-full sm:translate-y-0 sm:translate-x-full';

    return (
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`} onClick={onClose}>
            <div
                ref={panelRef}
                onClick={e => e.stopPropagation()}
                className={`absolute inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-sm bg-white dark:bg-gray-950 shadow-2xl transform flex flex-col ${transitionClasses} ${transformClasses}`}
                role="dialog"
                aria-modal="true"
                aria-label="Painel de filtros"
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Filtros</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" aria-label="Fechar filtros">
                        <CloseIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};
