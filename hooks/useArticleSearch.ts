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
    isActive: boolean
) => {
    const [criteria, setCriteria] = useState<PredictedCriteria>({ ...defaultPredictedValues, ...(defaultFilter || {}) });
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(isActive);
    const [error, setError] = useState<string | null>(null);
    const [filteredItems, setFilteredItems] = useState<ProcessedPredictedJob[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (isUserDataLoaded) {
            setCriteria({ ...defaultPredictedValues, ...(defaultFilter || {}) });
            setIsInitialized(true);
        }
    }, [defaultFilter, isUserDataLoaded]);

    useEffect(() => {
        if (!isActive || !isUserDataLoaded || !isInitialized) return;
        
        const controller = new AbortController();
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { items, count } = await fetchArticles(table, debouncedCriteria, page, itemsPerPage, controller.signal);
                setFilteredItems(items);
                setTotalItems(count);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    setError(err.message || "Ocorreu um erro desconhecido ao buscar os artigos.");
                    console.error(`Error fetching articles from ${table}:`, err);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
        return () => { controller.abort(); };

    }, [debouncedCriteria, page, table, isActive]);

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