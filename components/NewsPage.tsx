import React, { useState, useEffect } from 'react';
import { ProcessedPredictedJob } from '../types';
import { ArticleListPage } from './ArticleListPage';
import { TabNewsIcon } from './Icons';
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

const NewsPage: React.FC<{
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
}> = (props) => {
    const { accessibilitySettings } = useSettings();
    const { 
        favoriteNewsFilters, 
        setFavoriteNewsFilters, 
        defaultNewsFilter, 
        setDefaultNewsFilter,
        isUserDataLoaded
    } = useUserData();
    const [allArticles, setAllArticles] = useState<ProcessedPredictedJob[]>([]);

    useEffect(() => {
        fetchAllArticlesForSources('news_articles').then(setAllArticles);
    }, []);

    return (
        <ArticleListPage
            pageTitle="Notícias"
            table="news_articles"
            allArticles={allArticles}
            accessibilitySettings={accessibilitySettings}
            isFiltersOpen={props.isFiltersOpen}
            setIsFiltersOpen={props.setIsFiltersOpen}
            favoriteFilters={favoriteNewsFilters}
            setFavoriteFilters={setFavoriteNewsFilters}
            defaultFilter={defaultNewsFilter}
            setDefaultFilter={setDefaultNewsFilter}
            mainContentRef={props.mainContentRef}
            emptyStateIcon={<TabNewsIcon className="h-12 w-12" />}
            emptyStateTitle="Nenhuma Notícia Encontrada"
            emptyStateMessage="Não há notícias disponíveis no momento. Volte mais tarde!"
            itemType="news"
            onFilterCountChange={props.onFilterCountChange}
            isUserDataLoaded={isUserDataLoaded}
        />
    );
};

export default NewsPage;
