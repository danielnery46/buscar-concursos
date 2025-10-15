import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, FC, useRef } from 'react';
import type { SearchCriteria, PredictedCriteria, User, AccessibilitySettings } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import {
    ROTA_CIDADE_KEY, FAVORITE_SEARCHES_KEY, FAVORITE_PREDICTED_FILTERS_KEY, FAVORITE_NEWS_FILTERS_KEY,
    DEFAULT_SEARCH_KEY, DEFAULT_PREDICTED_FILTER_KEY, DEFAULT_NEWS_FILTER_KEY, ACCESSIBILITY_SETTINGS_KEY
} from '../constants';
import { useDebounce } from '../hooks/useDebounce';

interface UserDataContextType {
    cidadeRota: string;
    setCidadeRota: React.Dispatch<React.SetStateAction<string>>;
    favoriteSearches: SearchCriteria[];
    setFavoriteSearches: React.Dispatch<React.SetStateAction<SearchCriteria[]>>;
    favoritePredictedFilters: PredictedCriteria[];
    setFavoritePredictedFilters: React.Dispatch<React.SetStateAction<PredictedCriteria[]>>;
    favoriteNewsFilters: PredictedCriteria[];
    setFavoriteNewsFilters: React.Dispatch<React.SetStateAction<PredictedCriteria[]>>;
    defaultSearch: SearchCriteria | null;
    setDefaultSearch: React.Dispatch<React.SetStateAction<SearchCriteria | null>>;
    defaultPredictedFilter: PredictedCriteria | null;
    setDefaultPredictedFilter: React.Dispatch<React.SetStateAction<PredictedCriteria | null>>;
    defaultNewsFilter: PredictedCriteria | null;
    setDefaultNewsFilter: React.Dispatch<React.SetStateAction<PredictedCriteria | null>>;
    isUserDataLoaded: boolean;
    exportUserData: () => void;
    importUserData: (file: File) => Promise<AccessibilitySettings | undefined>;
    clearAllLocalData: () => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

const getLocalItem = (key: string, defaultValue: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
};

// This maps the localStorage keys to the database column names.
const keyToColumnMap: { [key: string]: string } = {
    [ROTA_CIDADE_KEY]: 'rota_cidade',
    [FAVORITE_SEARCHES_KEY]: 'favorite_searches',
    [FAVORITE_PREDICTED_FILTERS_KEY]: 'favorite_predicted_filters',
    [FAVORITE_NEWS_FILTERS_KEY]: 'favorite_news_filters',
    [DEFAULT_SEARCH_KEY]: 'default_search',
    [DEFAULT_PREDICTED_FILTER_KEY]: 'default_predicted_filter',
    [DEFAULT_NEWS_FILTER_KEY]: 'default_news_filter',
};

const usePersistentState = <T,>(value: T, user: User | null, isLoaded: boolean, key: string) => {
    const debouncedValue = useDebounce(value, 1500);
    const isInitialRunAfterLoad = useRef(true);

    useEffect(() => {
        // Reset the flag whenever the context is not 'loaded'. This happens on initial mount and on user changes.
        if (!isLoaded) {
            isInitialRunAfterLoad.current = true;
        }
    }, [isLoaded]);

    useEffect(() => {
        // Do not save anything until the initial data load is complete.
        if (!isLoaded) return;

        // Skip the very first effect run after data is loaded.
        // This is crucial to prevent overwriting cloud data with stale initial state
        // before the loaded data has been debounced.
        if (isInitialRunAfterLoad.current) {
            isInitialRunAfterLoad.current = false;
            return;
        }
        
        const saveState = async () => {
            if (user) {
                const columnName = keyToColumnMap[key];
                if (!columnName) {
                    console.warn(`No database column mapping found for key: ${key}`);
                    return;
                }
                const { error } = await supabase.from('user_data').upsert({ id: user.id, [columnName]: debouncedValue });
                if (error) console.error(`Error saving ${key} to column ${columnName}:`, error);
            } else {
                try {
                    localStorage.setItem(key, JSON.stringify(debouncedValue));
                } catch (e) {
                    console.error(`Error saving ${key} to localStorage:`, e);
                }
            }
        };

        saveState();
    }, [debouncedValue, user, key, isLoaded]);
};

interface UserDataProviderProps {
  children: ReactNode;
}

export const UserDataProvider: FC<UserDataProviderProps> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);

    const [cidadeRota, setCidadeRota] = useState<string>('');
    const [favoriteSearches, setFavoriteSearches] = useState<SearchCriteria[]>([]);
    const [favoritePredictedFilters, setFavoritePredictedFilters] = useState<PredictedCriteria[]>([]);
    const [favoriteNewsFilters, setFavoriteNewsFilters] = useState<PredictedCriteria[]>([]);
    const [defaultSearch, setDefaultSearch] = useState<SearchCriteria | null>(null);
    const [defaultPredictedFilter, setDefaultPredictedFilter] = useState<PredictedCriteria | null>(null);
    const [defaultNewsFilter, setDefaultNewsFilter] = useState<PredictedCriteria | null>(null);

    // Carrega os dados do usuário na mudança de autenticação
    useEffect(() => {
        const loadUserData = async () => {
            setIsUserDataLoaded(false); // Reset loading state on every auth change.
            if (authLoading) return;

            if (user) {
                const { data, error } = await supabase.from('user_data').select('*').eq('id', user.id).single();
                if (error && error.code !== 'PGRST116') console.error('Error fetching user data:', error);

                const mergeData = <T,>(cloudData: T, localKey: string, defaultValue: T): T => {
                    const isCloudDataEmpty = !cloudData || (Array.isArray(cloudData) && cloudData.length === 0);
                    if (isCloudDataEmpty) {
                        const localData = getLocalItem(localKey, defaultValue);
                        const isLocalDataPresent = localData && (!Array.isArray(localData) || localData.length > 0);
                        if (isLocalDataPresent) return localData;
                    }
                    return cloudData || defaultValue;
                };

                setCidadeRota(mergeData(data?.rota_cidade, ROTA_CIDADE_KEY, ''));
                setFavoriteSearches(mergeData(data?.favorite_searches, FAVORITE_SEARCHES_KEY, []));
                setFavoritePredictedFilters(mergeData(data?.favorite_predicted_filters, FAVORITE_PREDICTED_FILTERS_KEY, []));
                setFavoriteNewsFilters(mergeData(data?.favorite_news_filters, FAVORITE_NEWS_FILTERS_KEY, []));
                setDefaultSearch(mergeData(data?.default_search, DEFAULT_SEARCH_KEY, null));
                setDefaultPredictedFilter(mergeData(data?.default_predicted_filter, DEFAULT_PREDICTED_FILTER_KEY, null));
                setDefaultNewsFilter(mergeData(data?.default_news_filter, DEFAULT_NEWS_FILTER_KEY, null));
            } else {
                setCidadeRota(getLocalItem(ROTA_CIDADE_KEY, ''));
                setFavoriteSearches(getLocalItem(FAVORITE_SEARCHES_KEY, []));
                setFavoritePredictedFilters(getLocalItem(FAVORITE_PREDICTED_FILTERS_KEY, []));
                setFavoriteNewsFilters(getLocalItem(FAVORITE_NEWS_FILTERS_KEY, []));
                setDefaultSearch(getLocalItem(DEFAULT_SEARCH_KEY, null));
                setDefaultPredictedFilter(getLocalItem(DEFAULT_PREDICTED_FILTER_KEY, null));
                setDefaultNewsFilter(getLocalItem(DEFAULT_NEWS_FILTER_KEY, null));
            }
            setIsUserDataLoaded(true); // Mark as loaded only after all state setters have been called.
        };
        loadUserData();
    }, [user, authLoading]);
    
    // Hooks de persistência
    usePersistentState(cidadeRota, user, isUserDataLoaded, ROTA_CIDADE_KEY);
    usePersistentState(favoriteSearches, user, isUserDataLoaded, FAVORITE_SEARCHES_KEY);
    usePersistentState(favoritePredictedFilters, user, isUserDataLoaded, FAVORITE_PREDICTED_FILTERS_KEY);
    usePersistentState(favoriteNewsFilters, user, isUserDataLoaded, FAVORITE_NEWS_FILTERS_KEY);
    usePersistentState(defaultSearch, user, isUserDataLoaded, DEFAULT_SEARCH_KEY);
    usePersistentState(defaultPredictedFilter, user, isUserDataLoaded, DEFAULT_PREDICTED_FILTER_KEY);
    usePersistentState(defaultNewsFilter, user, isUserDataLoaded, DEFAULT_NEWS_FILTER_KEY);

    const exportUserData = useCallback(() => {
        // As configurações de acessibilidade estão em seu próprio contexto, então lemos do localStorage para simplicidade na exportação.
        // Isso é um compromisso de design para evitar dependências complexas entre contextos.
        const accessibilitySettings = getLocalItem(ACCESSIBILITY_SETTINGS_KEY, {});
        const dataStr = JSON.stringify({
            version: "2.0.0",
            timestamp: new Date().toISOString(),
            data: {
                [FAVORITE_SEARCHES_KEY]: favoriteSearches,
                [FAVORITE_PREDICTED_FILTERS_KEY]: favoritePredictedFilters,
                [FAVORITE_NEWS_FILTERS_KEY]: favoriteNewsFilters,
                [DEFAULT_SEARCH_KEY]: defaultSearch,
                [DEFAULT_PREDICTED_FILTER_KEY]: defaultPredictedFilter,
                [DEFAULT_NEWS_FILTER_KEY]: defaultNewsFilter,
                [ROTA_CIDADE_KEY]: cidadeRota,
                [ACCESSIBILITY_SETTINGS_KEY]: accessibilitySettings,
            }
        }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `buscar-concursos-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [favoriteSearches, favoritePredictedFilters, favoriteNewsFilters, defaultSearch, defaultPredictedFilter, defaultNewsFilter, cidadeRota]);

    const importUserData = useCallback((file: File): Promise<AccessibilitySettings | undefined> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsedData = JSON.parse(e.target?.result as string);
                    if (!parsedData.data || !parsedData.version) throw new Error("Arquivo de backup inválido.");
                    
                    const { data } = parsedData;
                    if (data[FAVORITE_SEARCHES_KEY] !== undefined) setFavoriteSearches(data[FAVORITE_SEARCHES_KEY] || []);
                    if (data[FAVORITE_PREDICTED_FILTERS_KEY] !== undefined) setFavoritePredictedFilters(data[FAVORITE_PREDICTED_FILTERS_KEY] || []);
                    if (data[FAVORITE_NEWS_FILTERS_KEY] !== undefined) setFavoriteNewsFilters(data[FAVORITE_NEWS_FILTERS_KEY] || []);
                    if (data[DEFAULT_SEARCH_KEY] !== undefined) setDefaultSearch(data[DEFAULT_SEARCH_KEY] || null);
                    if (data[DEFAULT_PREDICTED_FILTER_KEY] !== undefined) setDefaultPredictedFilter(data[DEFAULT_PREDICTED_FILTER_KEY] || null);
                    if (data[DEFAULT_NEWS_FILTER_KEY] !== undefined) setDefaultNewsFilter(data[DEFAULT_NEWS_FILTER_KEY] || null);
                    if (data[ROTA_CIDADE_KEY] !== undefined) setCidadeRota(data[ROTA_CIDADE_KEY] || '');
                    
                    const accessibilitySettings = data[ACCESSIBILITY_SETTINGS_KEY];
                    resolve(accessibilitySettings);
                } catch (error) {
                    reject(new Error("Falha ao processar o arquivo. Verifique se é um backup válido."));
                }
            };
            reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
            reader.readAsText(file);
        });
    }, []);

    const clearAllLocalData = useCallback(() => {
        localStorage.clear();
        window.location.reload();
    }, []);

    const value = {
        cidadeRota, setCidadeRota,
        favoriteSearches, setFavoriteSearches,
        favoritePredictedFilters, setFavoritePredictedFilters,
        favoriteNewsFilters, setFavoriteNewsFilters,
        defaultSearch, setDefaultSearch,
        defaultPredictedFilter, setDefaultPredictedFilter,
        defaultNewsFilter, setDefaultNewsFilter,
        isUserDataLoaded,
        exportUserData,
        importUserData,
        clearAllLocalData
    };

    return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

export const useUserData = () => {
    const context = useContext(UserDataContext);
    if (context === undefined) {
        throw new Error('useUserData must be used within a UserDataProvider');
    }
    return context;
};