import React, { useState, useEffect } from 'react';
import { ProcessedPredictedJob } from '../types';
import { ArticleListPage } from './ArticleListPage';
import { BellIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';
import { supabase } from '../utils/supabase';

const fetchAllArticlesForSources = async (table: 'predicted_openings' | 'news_articles'): Promise<ProcessedPredictedJob[]> => {
    const { data, error } = await supabase.from(table).select('source');
    if (error) {
        console.error(`Error fetching sources from ${table}:`, error);
        return [];
    }
    return data as ProcessedPredictedJob[];
};

const PredictedJobsPage: React.FC<{
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
}> = (props) => {
    const { accessibilitySettings } = useSettings();
    const { 
        favoritePredictedFilters, 
        setFavoritePredictedFilters,
        defaultPredictedFilter,
        setDefaultPredictedFilter,
        isUserDataLoaded
    } = useUserData();
    const [allArticles, setAllArticles] = useState<ProcessedPredictedJob[]>([]);
    
    useEffect(() => {
        fetchAllArticlesForSources('predicted_openings').then(setAllArticles);
    }, []);

    return (
        <ArticleListPage
            pageTitle="Concursos Previstos"
            table="predicted_openings"
            allArticles={allArticles}
            accessibilitySettings={accessibilitySettings}
            isFiltersOpen={props.isFiltersOpen}
            setIsFiltersOpen={props.setIsFiltersOpen}
            favoriteFilters={favoritePredictedFilters}
            setFavoriteFilters={setFavoritePredictedFilters}
            defaultFilter={defaultPredictedFilter}
            setDefaultFilter={setDefaultPredictedFilter}
            mainContentRef={props.mainContentRef}
            emptyStateIcon={<BellIcon className="h-12 w-12" />}
            emptyStateTitle="Nenhum Concurso Previsto Encontrado"
            emptyStateMessage="Não há concursos previstos disponíveis no momento. Volte mais tarde!"
            itemType="predicted"
            onFilterCountChange={props.onFilterCountChange}
            isUserDataLoaded={isUserDataLoaded}
        />
    );
};

export default PredictedJobsPage;
