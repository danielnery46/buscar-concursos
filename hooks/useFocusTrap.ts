import { useEffect, useRef } from 'react';
import type React from 'react';

/**
 * Um hook customizado para prender o foco dentro de um modal ou diálogo quando ele está aberto.
 * @param isOpen - Booleano indicando se o modal está aberto.
 * @param modalRef - Ref object para o elemento container do modal.
 * @param handleClose - Função a ser chamada quando a tecla Escape é pressionada.
 * @param disableInitialFocus - Opcional, previne o foco automático no primeiro elemento. Se true, foca o container do modal.
 */
export const useFocusTrap = (
    isOpen: boolean, 
    modalRef: React.RefObject<HTMLElement>, 
    handleClose: () => void,
    disableInitialFocus = false
) => {
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      if (!isOpen || !modalRef.current) return;

      if (document.activeElement instanceof HTMLElement) {
        triggerElementRef.current = document.activeElement;
      }
      
      const focusableElements = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      
      const firstElement = focusableElements.length > 0 ? focusableElements[0] : null;
      const lastElement = focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : null;
      
      // Define o foco inicial
      if (!disableInitialFocus && firstElement) {
        // FIX: Explicitly cast to HTMLElement to ensure the `focus` method is available.
        (firstElement as HTMLElement).focus();
      } else if (modalRef.current) {
        modalRef.current.focus({ preventScroll: true });
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            handleClose();
            return;
        }
        
        if (event.key === 'Tab' && focusableElements.length > 0) {
          if (!modalRef.current?.contains(document.activeElement)) {
              // FIX: Explicitly cast to HTMLElement to ensure the `focus` method is available.
              (firstElement as HTMLElement)?.focus();
              event.preventDefault();
              return;
          }

          if (event.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
              // FIX: Explicitly cast to HTMLElement to ensure the `focus` method is available.
              (lastElement as HTMLElement)?.focus();
              event.preventDefault();
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              // FIX: Explicitly cast to HTMLElement to ensure the `focus` method is available.
              (firstElement as HTMLElement)?.focus();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (triggerElementRef.current) {
            triggerElementRef.current.focus();
        }
      };
    }, [isOpen, modalRef, handleClose, disableInitialFocus]);
};