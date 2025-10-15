import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

interface SavedItem {
    name?: string;
}

interface UseSavedItemsProps<T extends SavedItem> {
    setFavoriteItems: Dispatch<SetStateAction<T[]>>;
    setDefaultItem: Dispatch<SetStateAction<T | null>>;
    criteria: T;
    onClear: () => void;
}

/**
 * Hook customizado para gerenciar a lógica de salvar itens como favoritos ou padrão.
 * Encapsula o estado de sucesso e os temporizadores de feedback visual.
 */
export const useSavedItems = <T extends SavedItem>({
    setFavoriteItems,
    setDefaultItem,
    criteria,
    onClear,
}: UseSavedItemsProps<T>) => {
    const [favoriteStatus, setFavoriteStatus] = useState<'idle' | 'success'>('idle');
    const [defaultStatus, setDefaultStatus] = useState<'idle' | 'success'>('idle');

    useEffect(() => {
        if (favoriteStatus === 'success') {
            const timer = setTimeout(() => setFavoriteStatus('idle'), 2500);
            return () => clearTimeout(timer);
        }
    }, [favoriteStatus]);

    useEffect(() => {
        if (defaultStatus === 'success') {
            const timer = setTimeout(() => setDefaultStatus('idle'), 2500);
            return () => clearTimeout(timer);
        }
    }, [defaultStatus]);

    const handleAddFavorite = useCallback(() => {
        setFavoriteItems(prev => {
            const isDuplicate = prev.some(p => JSON.stringify(p) === JSON.stringify(criteria));
            if (isDuplicate) return prev;
            // Garante que a propriedade 'name' seja indefinida para novos favoritos, permitindo que o usuário nomeie posteriormente.
            const newFavorite: T = { ...criteria, name: undefined };
            return [newFavorite, ...prev].slice(0, 10);
        });
    }, [criteria, setFavoriteItems]);

    const handleFavorite = () => {
        handleAddFavorite();
        setFavoriteStatus('success');
    };

    const handleSaveDefault = () => {
        setDefaultItem(criteria);
        setDefaultStatus('success');
    };

    const handleRemoveDefault = () => {
        setDefaultItem(null);
        onClear();
    };

    return {
        favoriteStatus,
        defaultStatus,
        handleFavorite,
        handleSaveDefault,
        handleRemoveDefault,
    };
};
