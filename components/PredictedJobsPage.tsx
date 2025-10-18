import React, { useState, useEffect } from 'react';
import { ArticleListPage } from './ArticleListPage';
import { BellIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';
import { fetchSourcesForTable } from '../services/scrapingService';

const PredictedJobsPage: React.FC<{
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
    isActive: boolean;
}> = (props) => {
    const { accessibilitySettings } = useSettings();
    const { 
        favoritePredictedFilters, 
        setFavoritePredictedFilters,
        defaultPredictedFilter,
        setDefaultPredictedFilter,
        isUserDataLoaded
    } = useUserData();
    const [availableSources, setAvailableSources] = useState<string[]>([]);
    
    useEffect(() => {
        fetchSourcesForTable('predicted_openings').then(setAvailableSources);
    }, []);

    return (
        <ArticleListPage
            pageTitle="Concursos Previstos"
            table="predicted_openings"
            availableSources={availableSources}
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
            isActive={props.isActive}
        />
    );
};

export default PredictedJobsPage;
