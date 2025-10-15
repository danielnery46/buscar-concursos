import React, { useEffect, useRef } from 'react';
import { ProcessedPredictedJob, ArticleSortOption } from '../types';
import { ArticleListPage } from './ArticleListPage';
import { BellIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';

const PredictedJobsPage: React.FC<{
    predictedJobs: ProcessedPredictedJob[];
    isLoading: boolean;
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
            pageTitle="Concursos Previstos"
            items={props.predictedJobs}
            isLoading={props.isLoading}
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
            sortOption={sortOption}
            onSortChange={setSortOption}
            onFilterCountChange={props.onFilterCountChange}
            isUserDataLoaded={isUserDataLoaded}
        />
    );
};

export default PredictedJobsPage;