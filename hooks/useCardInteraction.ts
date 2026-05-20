import React, { useCallback } from 'react';
import { useModal } from '../contexts/ModalContext';

interface UseCardInteractionProps {
    link: string;
    title: string;
    openInModal: boolean;
}

export const useCardInteraction = ({ link, title, openInModal }: UseCardInteractionProps) => {
    const { openModal } = useModal();

    const handleCardClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        const isCtrlPressed = e.ctrlKey || e.metaKey;

        if (openInModal) {
            if (isCtrlPressed) {
                window.open(link, '_blank', 'noopener,noreferrer');
            } else {
                openModal('webContent', { url: link, title });
            }
        } else {
            if (isCtrlPressed) {
                openModal('webContent', { url: link, title });
            } else {
                window.open(link, '_blank', 'noopener,noreferrer');
            }
        }
    }, [link, title, openInModal, openModal]);

    return { handleCardClick };
};