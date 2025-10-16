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
    itemsPerPage: number
) => {
    const [criteria, setCriteria] = useState<PredictedCriteria>({ ...defaultPredictedValues, ...(defaultFilter || {}) });
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filteredItems, setFilteredItems] = useState<ProcessedPredictedJob[]>([]);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (isUserDataLoaded) {
            setCriteria({ ...defaultPredictedValues, ...(defaultFilter || {}) });
        }
    }, [defaultFilter, isUserDataLoaded]);

    useEffect(() => {
        if (!isUserDataLoaded) return;
        
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
                    const message = table === 'news_articles' ? 'Não foi possível carregar as notícias.' : 'Não foi possível carregar os concursos previstos.';
                    setError(`${message} Tente novamente mais tarde.`);
                    console.error(`Error fetching articles from ${table}:`, err);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        return () => { controller.abort(); };

    }, [debouncedCriteria, page, itemsPerPage, table, isUserDataLoaded]);

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