import React, { useState, useEffect } from 'react';
import { ArticleListPage } from './ArticleListPage';
import { TabNewsIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';
import { fetchSourcesForTable } from '../services/scrapingService';

const NewsPage: React.FC<{
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
    isActive: boolean;
}> = (props) => {
    const { accessibilitySettings } = useSettings();
    const { 
        favoriteNewsFilters, 
        setFavoriteNewsFilters, 
        defaultNewsFilter, 
        setDefaultNewsFilter,
        isUserDataLoaded
    } = useUserData();
    const [availableSources, setAvailableSources] = useState<string[]>([]);

    useEffect(() => {
        fetchSourcesForTable('news_articles').then(setAvailableSources);
    }, []);

    return (
        <ArticleListPage
            pageTitle="Notícias"
            table="news_articles"
            availableSources={availableSources}
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
            isActive={props.isActive}
        />
    );
};

export default NewsPage;
