import { useState, useEffect } from 'react';
import { ProcessedPredictedJob, PredictedCriteria } from '../types';
import { useDebounce } from './useDebounce';
import { normalizeText } from '../utils/text';
import { defaultPredictedValues, ESTADOS_POR_REGIAO } from '../constants';

export const calculatePredictedFilters = (criteria: PredictedCriteria): number => {
    let count = 0;
    if (criteria.location !== 'brasil') count++;
    if (criteria.searchTerm) count++;
    if (criteria.month !== 'todos') count++;
    if (criteria.year !== 'todos') count++;
    if (criteria.sources && criteria.sources.length > 0) count++;
    return count;
};

export const useArticleSearch = (
    items: ProcessedPredictedJob[],
    defaultFilter: PredictedCriteria | null,
    isUserDataLoaded: boolean
) => {
    const [criteria, setCriteria] = useState<PredictedCriteria>({ ...defaultPredictedValues, ...(defaultFilter || {}) });
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredItems, setFilteredItems] = useState<ProcessedPredictedJob[]>([]);

    useEffect(() => {
        if (isUserDataLoaded) {
            setCriteria({ ...defaultPredictedValues, ...(defaultFilter || {}) });
        }
    }, [defaultFilter, isUserDataLoaded]);

    useEffect(() => {
        if (!items.length) {
            setFilteredItems([]);
            return;
        }
    
        setIsLoading(true);
    
        // Defer filtering slightly to keep UI responsive
        const processingTimer = setTimeout(() => {
            const { searchTerm, location, month, year, sources } = debouncedCriteria;
    
            if (
                !searchTerm &&
                location === 'brasil' &&
                month === 'todos' &&
                year === 'todos' &&
                (!sources || sources.length === 0)
            ) {
                setFilteredItems(items);
            } else {
                const normalizedSearchTerm = normalizeText(searchTerm);
    
                const result = items.filter(item => {
                    // Location
                    if (location !== 'brasil') {
                        if (location.startsWith('regiao-')) {
                            const regionKeyRaw = location.replace('regiao-', '');
                            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
                            if (regionKey) {
                                const regionStates = ESTADOS_POR_REGIAO[regionKey].map(s => s.sigla);
                                if (!item.mentionedStates.some(s => regionStates.includes(s))) {
                                    return false;
                                }
                            }
                        } else {
                            if (!item.mentionedStates.includes(location.toUpperCase())) {
                                return false;
                            }
                        }
                    }
    
                    // Generate normalized title on the fly for searching
                    const normalizedTitle = normalizeText(item.title);

                    // Search Term
                    if (normalizedSearchTerm && !normalizedTitle.includes(normalizedSearchTerm)) {
                        return false;
                    }
    
                    // Date
                    if (month !== 'todos' && item.dateObject.getMonth() + 1 !== parseInt(month, 10)) {
                        return false;
                    }
                    if (year !== 'todos' && item.dateObject.getFullYear() !== parseInt(year, 10)) {
                        return false;
                    }
    
                    // Sources
                    if (sources && sources.length > 0 && (!item.source || !sources.includes(item.source))) {
                        return false;
                    }
                    
                    return true;
                });
                setFilteredItems(result);
            }
            
            setIsLoading(false);
        }, 10);
    
        return () => {
            clearTimeout(processingTimer);
        };
    }, [items, debouncedCriteria]);

    return {
        criteria,
        setCriteria,
        debouncedCriteria,
        filteredItems,
        isLoading,
    };
};