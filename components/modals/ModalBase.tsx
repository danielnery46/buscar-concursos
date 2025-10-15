import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CloseIcon } from '../Icons';
import { Button } from '../ui/Button';

// =================================================================================================
// INFRAESTRUTURA DE MODAL (COMPONENTE BASE & HOOKS)
// =================================================================================================

const MODAL_TRANSITION_DURATION = 200;

/**
 * Hook customizado para gerenciar o ciclo de vida e estado comuns de um modal.
 * @param isOpen - Booleano indicando se o modal está aberto.
 * @param onClose - Função para fechar o modal.
 * @param disableInitialFocus - Opcional, previne o foco no primeiro elemento.
 * @returns Um objeto com estado e manipuladores para o modal.
 */
export const useModalLifecycle = (isOpen: boolean, onClose: () => void, disableInitialFocus = false) => {
    const [showContent, setShowContent] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => {
        setShowContent(false);
        setTimeout(onClose, MODAL_TRANSITION_DURATION); // Aguarda a transição de saída
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const timer = setTimeout(() => {
                setShowContent(true);
            }, 10); // Pequeno atraso para permitir a renderização inicial
            return () => {
                clearTimeout(timer);
                document.body.style.overflow = 'unset';
            };
        } else {
            setShowContent(false);
        }
    }, [isOpen]);

    useFocusTrap(isOpen, modalRef, handleClose, disableInitialFocus);

    return { showContent, modalRef, handleClose };
};


interface ModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    children: (props: {
        showContent: boolean;
        modalRef: React.RefObject<HTMLDivElement>;
    }) => React.ReactNode;
    ariaLabelledBy: string;
    disableInitialFocus?: boolean;
}

export const ModalBase: React.FC<ModalBaseProps> = ({ isOpen, onClose, children, ariaLabelledBy, disableInitialFocus = false }) => {
    const { showContent, modalRef, handleClose } = useModalLifecycle(isOpen, onClose, disableInitialFocus);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 bg-black z-50 transition-opacity duration-200 ease-out ${showContent ? 'bg-opacity-60' : 'bg-opacity-0'}`}
            onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy}
        >
            <div className="flex justify-center items-center h-full w-full p-2 sm:p-4">
                {children({ showContent, modalRef })}
            </div>
        </div>
    );
};

// =================================================================================================
// LAYOUT DE MODAL DE CONTEÚDO (REUTILIZÁVEL)
// =================================================================================================
interface ContentModalLayoutProps {
    modalRef: React.RefObject<HTMLDivElement>;
    showContent: boolean;
    onClose: () => void;
    headerIcon: React.ReactNode;
    headerTitle: React.ReactNode;
    children: React.ReactNode;
    containerClasses?: string;
}

export const ContentModalLayout: React.FC<ContentModalLayoutProps> = ({ modalRef, showContent, onClose, headerIcon, headerTitle, children, containerClasses }) => {
    return (
        <div
            ref={modalRef}
            className={`bg-white dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-none dark:border dark:border-gray-800 w-full flex flex-col overflow-hidden transition-all duration-200 ease-out ${containerClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()}
        >
            <header className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-full">
                        {headerIcon}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {headerTitle}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar modal">
                    <CloseIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </Button>
            </header>
            {children}
        </div>
    );
};
