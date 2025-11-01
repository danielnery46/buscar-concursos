import { useState, useEffect } from 'react';
import { ProcessedPredictedJob, PredictedCriteria } from '../types';
import { useDebounce } from './useDebounce';
import { defaultPredictedValues } from '../constants';
import { fetchArticles } from '../services/scrapingService';

export const calculatePredictedFilters = (criteria: PredictedCriteria): number => {
    let count = 0;
    if (criteria.location !== 'brasil') count++;
    if (criteria.searchTerm) count++;
    if (criteria.month !== 'todos') count++;
    if (criteria.year !== 'todos') count++;
    if (criteria.sources && criteria.sources.length > 0) count++;
    if (criteria.sort !== defaultPredictedValues.sort) count++;
    return count;
};

export const useArticleSearch = (
    table: 'predicted_openings' | 'news_articles',
    defaultFilter: PredictedCriteria | null,
    isUserDataLoaded: boolean,
    page: number,
    itemsPerPage: number,
    isActive: boolean,
    quickSearchTerm: string
) => {
    const [criteria, setCriteria] = useState<PredictedCriteria>(defaultPredictedValues);
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(isActive);
    const [error, setError] = useState<string | null>(null);
    const [filteredItems, setFilteredItems] = useState<ProcessedPredictedJob[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isReadyToFetch, setIsReadyToFetch] = useState(false);

    useEffect(() => {
        if (isUserDataLoaded) {
            // ... (lógica inicial)
            const initialCriteria = { ...defaultPredictedValues, ...(defaultFilter || {}) };
            setCriteria(initialCriteria);
            
            const timer = setTimeout(() => {
                setIsReadyToFetch(true);
            }, 500); 

            return () => clearTimeout(timer);
        }
    }, [defaultFilter, isUserDataLoaded, table]);


    useEffect(() => {
        if (!isActive || !isReadyToFetch) return;
        
        const controller = new AbortController();
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { items, count } = await fetchArticles(table, debouncedCriteria, page, itemsPerPage, quickSearchTerm, controller.signal);
                setFilteredItems(items);
                setTotalItems(count);
                setIsLoading(false); // <-- CORREÇÃO: Movido para o fim do 'try'
            } catch (err: any) {
                // A lógica do 'catch' está correta
                if (!controller.signal.aborted) {
                    setError(err.message || "Ocorreu um erro desconhecido ao buscar os artigos.");
                    console.error(`Error fetching articles from ${table}:`, err);
                    setIsLoading(false); // <-- CORREÇÃO: Adicionado aqui também
                }
            }
            // CORREÇÃO: Bloco 'finally' removido.
        };

        fetchData();
        return () => { controller.abort(); };

    }, [debouncedCriteria, quickSearchTerm, page, table, isActive, isReadyToFetch, itemsPerPage]);

    return {
        criteria,
        setCriteria,
        debouncedCriteria,
        filteredItems,
        totalItems,
        isLoading,
        error,
    };
};