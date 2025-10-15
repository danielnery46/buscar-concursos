import { useState, useEffect, useCallback } from 'react';
import { City, ProcessedJob, ProcessedPredictedJob } from '../types';
import { fetchAllData } from '../services/scrapingService';

export const useAppData = () => {
    const [processedJobs, setProcessedJobs] = useState<ProcessedJob[]>([]);
    const [processedPredictedJobs, setProcessedPredictedJobs] = useState<ProcessedPredictedJob[]>([]);
    const [processedNews, setProcessedNews] = useState<ProcessedPredictedJob[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
    const [cityDataCache, setCityDataCache] = useState<Record<string, City[]>>({});

    const loadCitiesForState = useCallback(async (state: string): Promise<Record<string, City[]>> => {
        const stateUpper = state.toUpperCase();
        if (cityDataCache[stateUpper]) {
            return Promise.resolve({ [stateUpper]: cityDataCache[stateUpper] });
        }
        try {
            const res = await fetch(`/data/cities/${stateUpper}.json`);
            if (!res.ok) throw new Error(`Failed to load cities for ${stateUpper}`);
            const data = await res.json();
            const newCache = { [stateUpper]: data };
            setCityDataCache(prevCache => ({...prevCache, ...newCache}));
            return newCache;
        } catch (error) {
            console.error(`Error fetching city data for ${stateUpper}:`, error);
            return Promise.reject(error);
        }
    }, [cityDataCache]);

    useEffect(() => {
        const loadAllData = async () => {
            setIsInitialLoading(true);
            setInitialLoadError(null);
            try {
                // Carrega todos os dados de concursos, previstos e notícias. Cidades são carregadas sob demanda.
                const { allJobs, allPredictedJobs, allNews } = await fetchAllData();
                
                // Pré-carrega as cidades mais comuns para uma melhor experiência inicial
                const commonStates = ['SP', 'MG', 'RJ', 'BA', 'PR'];
                const cityPromises = commonStates.map(state => 
                    fetch(`/data/cities/${state}.json`).then(res => res.json()).catch(() => [])
                );
                const citiesData = await Promise.all(cityPromises);
                const initialCache: Record<string, City[]> = {};
                commonStates.forEach((state, index) => {
                    initialCache[state] = citiesData[index];
                });
                setCityDataCache(initialCache);

                setProcessedJobs(allJobs);
                setProcessedPredictedJobs(allPredictedJobs.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime()));
                setProcessedNews(allNews.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime()));

            } catch (err) {
                setInitialLoadError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
            } finally {
                setIsInitialLoading(false);
            }
        };
        loadAllData();
    }, []);

    return {
        processedJobs,
        processedPredictedJobs,
        processedNews,
        isInitialLoading,
        initialLoadError,
        cityDataCache,
        loadCitiesForState
    };
};
