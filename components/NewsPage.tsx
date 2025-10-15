import React, { useEffect, useRef } from 'react';
import { ProcessedPredictedJob, ArticleSortOption } from '../types';
import { ArticleListPage } from './ArticleListPage';
import { TabNewsIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';

const NewsPage: React.FC<{
    news: ProcessedPredictedJob[];
    isLoading: boolean;
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
    const [sortOption, setSortOption] = React.useState<ArticleSortOption>('date-desc');
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            if (props.mainContentRef.current) {
                props.mainContentRef.current.scrollTo({
                    top: props.mainContentRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [sortOption, props.mainContentRef]);

    return (
        <ArticleListPage
            pageTitle="Notícias"
            items={props.news}
            isLoading={props.isLoading}
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
            sortOption={sortOption}
            onSortChange={setSortOption}
            onFilterCountChange={props.onFilterCountChange}
            isUserDataLoaded={isUserDataLoaded}
        />
    );
};

export default NewsPage;