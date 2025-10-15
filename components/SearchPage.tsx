import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { City, ProcessedJob, SearchCriteria, OpenJobsSortOption } from '../types';
import { SearchForm } from './SearchForm';
import { systemDefaultValues, VIZINHANCAS_ESTADOS } from '../constants';
import { ResultsList } from './ResultsList';
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay';
import { FiltersPanel } from './FiltersPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';
import { useAppData } from '../hooks/useAppData';
import { useJobSearch, calculateActiveFilters, sortJobs } from '../hooks/useJobSearch';
// FIX: Import 'formatSearchCriteria' to resolve reference error.
import { formatSearchCriteria } from '../utils/formatters';

const ITEMS_PER_PAGE = 12;

interface SearchPageProps {
    jobs: ProcessedJob[];
    isInitialLoading: boolean;
    cityDataCache: Record<string, City[]>;
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({
    jobs,
    isInitialLoading,
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
    
    const {
        criteria,
        setCriteria,
        debouncedCriteria,
        concursos,
        processosSeletivos,
        summaryData,
        isLoading: isFiltering,
    } = useJobSearch(jobs, cityDataCache, defaultSearch, isUserDataLoaded);
    
    const [formKey, setFormKey] = useState(0);
    const [targetTab, setTargetTab] = useState<'concursos' | 'processos_seletivos' | null>(null);

    const [concursosPage, setConcursosPage] = useState(1);
    const [processosPage, setProcessosPage] = useState(1);
    const [sortOption, setSortOption] = useState<OpenJobsSortOption>('alpha-asc');
    const isInitialMount = useRef(true);

    useEffect(() => {
        onFilterCountChange(calculateActiveFilters(criteria));
    }, [criteria, onFilterCountChange]);

    useEffect(() => {
        const state = criteria.estado;
        const shouldIncludeNeighbors = criteria.incluirVizinhos;

        if (state.length === 2) {
            const statesToLoad = [state.toUpperCase()];
            if (shouldIncludeNeighbors && VIZINHANCAS_ESTADOS[state.toUpperCase()]) {
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
                    .finally(() => {
                        setIsCityDataLoading(false);
                    });
            }
        }
    }, [criteria.estado, criteria.incluirVizinhos, cityDataCache, loadCitiesForState]);

    useEffect(() => {
        setConcursosPage(1);
        setProcessosPage(1);
    }, [debouncedCriteria, sortOption]);

    useEffect(() => {
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedCriteria, mainContentRef]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            if (mainContentRef.current) {
                mainContentRef.current.scrollTo({
                    top: mainContentRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [sortOption, mainContentRef]);

    const isLoading = isInitialLoading || isFiltering;
    
    const sortedConcursos = useMemo(() => sortJobs(concursos, sortOption), [concursos, sortOption]);
    const sortedProcessos = useMemo(() => sortJobs(processosSeletivos, sortOption), [processosSeletivos, sortOption]);
    
    const paginatedConcursos = useMemo(() => sortedConcursos.slice((concursosPage - 1) * ITEMS_PER_PAGE, concursosPage * ITEMS_PER_PAGE), [sortedConcursos, concursosPage]);
    const paginatedProcessos = useMemo(() => sortedProcessos.slice((processosPage - 1) * ITEMS_PER_PAGE, processosPage * ITEMS_PER_PAGE), [sortedProcessos, processosPage]);
    
    const handleClearFilters = useCallback(() => {
        setCriteria(systemDefaultValues);
        setConcursosPage(1);
        setProcessosPage(1);
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
        key: formKey,
        criteria: criteria, 
        onCriteriaChange: setCriteria,
        onClearFilters: handleClearFilters,
        onRunFavorite: handleRunSearch,
        isCityDataLoading,
        cities: citiesForSelectedState,
        summaryData,
        isLoading: isLoading,
    }), [formKey, criteria, handleClearFilters, handleRunSearch, isCityDataLoading, citiesForSelectedState, summaryData, isLoading, setCriteria]);
    
    const { estado, incluirVizinhos } = debouncedCriteria;
    const showLocationPillForStateJobs = estado === 'brasil' || estado.startsWith('regiao-') || incluirVizinhos;

    return (
        <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
            <div className="w-full items-start flex-grow flex flex-col">
                <main className="w-full flex-grow flex flex-col">
                    {!isInitialLoading && (
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
                    )}
                    <ResultsList 
                        mainContentRef={mainContentRef}
                        concursosResults={paginatedConcursos} totalConcursos={concursos.length} concursosPage={concursosPage} setConcursosPage={setConcursosPage}
                        processosSeletivosResults={paginatedProcessos} totalProcessos={processosSeletivos.length} processosPage={processosPage} setProcessosPage={setProcessosPage}
                        itemsPerPage={ITEMS_PER_PAGE} isLoading={isLoading} onClearFilters={handleClearFilters}
                        targetTab={targetTab} setTargetTab={setTargetTab}
                        hasActiveFilters={JSON.stringify(debouncedCriteria) !== JSON.stringify(systemDefaultValues)}
                        showLocationPillForStateJobs={showLocationPillForStateJobs} searchEstado={debouncedCriteria.estado}
                        sortOption={sortOption}
                        onSortChange={setSortOption}
                    />
                </main>
            </div>
            
            <FiltersPanel 
                key={`filters-panel`}
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