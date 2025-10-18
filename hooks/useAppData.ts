import { useState, useEffect, useCallback } from 'react';
import { City } from '../types';
import { supabaseUrl } from '../utils/supabase';

export const useAppData = () => {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
    const [cityDataCache, setCityDataCache] = useState<Record<string, City[]>>({});

    const loadCitiesForState = useCallback(async (state: string): Promise<Record<string, City[]>> => {
        const stateUpper = state.toUpperCase();
        if (cityDataCache[stateUpper]) {
            return Promise.resolve({ [stateUpper]: cityDataCache[stateUpper] });
        }
        try {
            const res = await fetch(`${supabaseUrl}/storage/v1/object/public/static-assets/cities/${stateUpper}.json`);
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
        const loadInitialCities = async () => {
            setIsInitialLoading(true);
            setInitialLoadError(null);
            try {
                // Pré-carrega as cidades mais comuns para uma melhor experiência inicial
                const commonStates = ['SP', 'MG', 'RJ', 'BA', 'PR'];
                const cityPromises = commonStates.map(state => 
                    fetch(`${supabaseUrl}/storage/v1/object/public/static-assets/cities/${state}.json`).then(res => {
                        if (!res.ok) throw new Error(`Failed to load cities for ${state}`);
                        return res.json();
                    }).catch(() => [])
                );
                const citiesData = await Promise.all(cityPromises);
                const initialCache: Record<string, City[]> = {};
                commonStates.forEach((state, index) => {
                    initialCache[state] = citiesData[index];
                });
                setCityDataCache(initialCache);

            } catch (err) {
                setInitialLoadError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
            } finally {
                setIsInitialLoading(false);
            }
        };
        loadInitialCities();
    }, []);

    return {
        isInitialLoading,
        initialLoadError,
        cityDataCache,
        loadCitiesForState
    };
};
