import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { City, SearchCriteria } from '../types';
import { SearchForm } from './SearchForm';
import { systemDefaultValues, VIZINHANCAS_ESTADOS } from '../constants';
import { ResultsList } from './ResultsList';
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay';
import { FiltersPanel } from './FiltersPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';
import { useAppData } from '../hooks/useAppData';
import { useJobSearch, calculateActiveFilters } from '../hooks/useJobSearch';
import { formatSearchCriteria } from '../utils/formatters';
import { InitialLoadErrorDisplay } from './StateDisplays';

const ITEMS_PER_PAGE = 12;

interface SearchPageProps {
    cityDataCache: Record<string, City[]>;
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({
    cityDataCache: initialCityDataCache,
    isFiltersOpen,
    setIsFiltersOpen,
    mainContentRef,
    onFilterCountChange
}) => {
    const { accessibilitySettings } = useSettings();
    const { favoriteSearches, defaultSearch, isUserDataLoaded } = useUserData();
    const { loadCitiesForState } = useAppData();

    const [cityDataCache, setCityDataCache] = useState(initialCityDataCache);
    const [isCityDataLoading, setIsCityDataLoading] = useState(false);
    
    const [concursosPage, setConcursosPage] = useState(1);
    const [processosPage, setProcessosPage] = useState(1);
    
    const {
        criteria,
        setCriteria,
        debouncedCriteria,
        concursos,
        totalConcursos,
        processosSeletivos,
        totalProcessos,
        summaryData,
        isLoading,
        error,
    } = useJobSearch(cityDataCache, defaultSearch, isUserDataLoaded, concursosPage, processosPage, ITEMS_PER_PAGE);
    
    const [formKey, setFormKey] = useState(0);
    const [targetTab, setTargetTab] = useState<'concursos' | 'processos_seletivos' | null>(null);

    useEffect(() => {
        onFilterCountChange(calculateActiveFilters(criteria));
    }, [criteria, onFilterCountChange]);

    useEffect(() => {
        const state = criteria.estado;
        if (state.length === 2 && !cityDataCache[state.toUpperCase()]) {
            const statesToLoad = [state.toUpperCase()];
            if (criteria.incluirVizinhos && VIZINHANCAS_ESTADOS[state.toUpperCase()]) {
                statesToLoad.push(...VIZINHANCAS_ESTADOS[state.toUpperCase()]);
            }
            const unloadedStates = statesToLoad.filter(s => !cityDataCache[s]);
            if (unloadedStates.length > 0) {
                setIsCityDataLoading(true);
                Promise.all(unloadedStates.map(s => loadCitiesForState(s)))
                    .then(newCaches => {
                        const mergedCache = newCaches.reduce((acc, current) => ({ ...acc, ...current }), {});
                        setCityDataCache(prevCache => ({ ...prevCache, ...mergedCache }));
                    })
                    .finally(() => setIsCityDataLoading(false));
            }
        }
    }, [criteria.estado, criteria.incluirVizinhos, cityDataCache, loadCitiesForState]);

    useEffect(() => {
        setConcursosPage(1);
        setProcessosPage(1);
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedCriteria, mainContentRef]);

    const handleClearFilters = useCallback(() => {
        setCriteria(systemDefaultValues);
    }, [setCriteria]);

    const handleClearSingleFilter = useCallback((key: keyof SearchCriteria, value?: string) => {
        setCriteria(prev => {
            const newCriteria: SearchCriteria = { ...prev };
            if (key === 'escolaridade' && value) {
                newCriteria.escolaridade = newCriteria.escolaridade.filter(level => level !== value);
                return newCriteria;
            }
            const keyToReset = key as keyof SearchCriteria;
            (newCriteria as any)[keyToReset] = systemDefaultValues[keyToReset as keyof typeof systemDefaultValues];
            if (keyToReset === 'estado') {
                newCriteria.cidadeFiltro = systemDefaultValues.cidadeFiltro;
                newCriteria.distanciaRaio = systemDefaultValues.distanciaRaio;
                newCriteria.incluirVizinhos = systemDefaultValues.incluirVizinhos;
            } else if (keyToReset === 'cidadeFiltro') {
                newCriteria.distanciaRaio = systemDefaultValues.distanciaRaio;
            }
            return newCriteria;
        });
    }, [setCriteria]);

    const handleRunSearch = useCallback((criteriaToRun: SearchCriteria) => {
        setCriteria({ ...systemDefaultValues, ...criteriaToRun });
        setFormKey(k => k + 1);
        setIsFiltersOpen(false);
    }, [setIsFiltersOpen, setCriteria]);

    const handleCloseFilters = useCallback(() => {
        setIsFiltersOpen(false);
    }, [setIsFiltersOpen]);

    const citiesForSelectedState = useMemo(() => {
        const state = criteria.estado;
        if (state.length === 2 && cityDataCache[state.toUpperCase()]) {
            return [...cityDataCache[state.toUpperCase()]].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [criteria.estado, cityDataCache]);

    const searchFormProps = useMemo(() => ({
        key: formKey, criteria, onCriteriaChange: setCriteria, onClearFilters: handleClearFilters,
        onRunFavorite: handleRunSearch, isCityDataLoading, cities: citiesForSelectedState,
        summaryData, isLoading,
    }), [formKey, criteria, setCriteria, handleClearFilters, handleRunSearch, isCityDataLoading, citiesForSelectedState, summaryData, isLoading]);
    
    const { estado, incluirVizinhos } = debouncedCriteria;
    const showLocationPillForStateJobs = estado === 'brasil' || estado.startsWith('regiao-') || incluirVizinhos;

    if (error) {
        return <InitialLoadErrorDisplay title="Erro ao Carregar Concursos" message={error} />;
    }

    return (
        <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
            <div className="w-full items-start flex-grow flex flex-col">
                <main className="w-full flex-grow flex flex-col">
                    <ActiveFiltersDisplay<SearchCriteria>
                        criteria={criteria}
                        defaultCriteria={systemDefaultValues}
                        onClearFilter={handleClearSingleFilter}
                        onClearAllFilters={handleClearFilters}
                        favoriteItems={favoriteSearches}
                        onRunFavorite={handleRunSearch}
                        formatItem={formatSearchCriteria}
                        accessibilitySettings={accessibilitySettings}
                    />
                    <ResultsList 
                        mainContentRef={mainContentRef}
                        concursosResults={concursos} totalConcursos={totalConcursos} concursosPage={concursosPage} setConcursosPage={setConcursosPage}
                        processosSeletivosResults={processosSeletivos} totalProcessos={totalProcessos} processosPage={processosPage} setProcessosPage={setProcessosPage}
                        itemsPerPage={ITEMS_PER_PAGE} isLoading={isLoading} onClearFilters={handleClearFilters}
                        targetTab={targetTab} setTargetTab={setTargetTab}
                        hasActiveFilters={JSON.stringify(debouncedCriteria) !== JSON.stringify(systemDefaultValues)}
                        showLocationPillForStateJobs={showLocationPillForStateJobs} searchEstado={debouncedCriteria.estado}
                        debouncedCriteria={debouncedCriteria}
                    />
                </main>
            </div>
            
            <FiltersPanel 
                isOpen={isFiltersOpen} 
                onClose={handleCloseFilters}
            >
                <div className="p-4 sm:p-5 flex-1">
                    <SearchForm {...searchFormProps} />
                </div>
            </FiltersPanel>
        </div>
    );
};

export default SearchPage;