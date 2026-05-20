import { useEffect, useRef } from 'react';
import type React from 'react';

/**
 * A custom hook to trap focus within a modal/dialog when open.
 * Handles initial focus, tab trapping, Escape key, restoring focus on close, and body scroll prevention.
 * @param isOpen - Boolean indicating if the modal is open.
 * @param containerRef - Ref object for the modal container element.
 * @param handleClose - Function to call when the Escape key is pressed.
 * @param disableInitialFocus - Optional, prevents automatic focus on the first element.
 */
export const useFocusTrap = (
    isOpen: boolean,
    containerRef: React.RefObject<HTMLElement>,
    handleClose: () => void,
    disableInitialFocus = false
) => {
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const modal = containerRef.current;
        if (!modal) {
            return;
        }

        // 1. Armazena o elemento que tinha o foco antes de abrir
        if (document.activeElement instanceof HTMLElement) {
            triggerElementRef.current = document.activeElement;
        }
        
        // 2. Previne o scroll do body
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // 3. Obtém todos os elementos focáveis visíveis
        const focusableElements = Array.from(
            modal.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        // FIX: Use a type guard to ensure elements are HTMLElements and correctly type the filtered array.
        ).filter((el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null);

        const firstElement = focusableElements.length > 0 ? focusableElements[0] : null;
        const lastElement = focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : null;

        // 4. Define o foco inicial após um pequeno atraso para permitir transições
        const timerId = setTimeout(() => {
            if (!disableInitialFocus && firstElement) {
                firstElement.focus();
            } else if (modal) { // Foca o container se não houver elementos ou se o foco inicial estiver desabilitado
                modal.setAttribute('tabindex', '-1'); // Garante que o container possa ser focado
                modal.focus({ preventScroll: true });
            }
        }, 50);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
                return;
            }

            if (event.key === 'Tab') {
                if (focusableElements.length <= 1) {
                    event.preventDefault(); // Impede a navegação se houver apenas um ou nenhum elemento focável
                    return;
                }
                
                // Se o foco escapou do modal, força-o a voltar para dentro
                if (!modal.contains(document.activeElement)) {
                    firstElement?.focus();
                    event.preventDefault();
                    return;
                }

                if (event.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement?.focus();
                        event.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement?.focus();
                        event.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // 5. Limpeza ao desmontar ou quando `isOpen` se torna falso
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
            
            // 6. Restaura o foco para o elemento que acionou o modal
            triggerElementRef.current?.focus();
        };
    }, [isOpen, containerRef, handleClose, disableInitialFocus]);
};
