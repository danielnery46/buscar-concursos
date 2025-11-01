import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { City, SearchCriteria, ViewMode, OpenJobsSortOption } from '../types';
import { SearchForm } from './SearchForm';
import { systemDefaultValues, VIZINHANCAS_ESTADOS } from '../constants';
import { ResultsList } from './ResultsList';
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay';
import { FiltersPanel } from './FiltersPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useUserData } from '../contexts/UserDataContext';
import { useJobSearch, calculateActiveFilters } from '../hooks/useJobSearch';
import { formatSearchCriteria } from '../utils/formatters';
import { InitialLoadErrorDisplay } from './StateDisplays';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { LayoutGridIcon, ListIcon, SearchIcon } from './Icons';
import { Button } from './ui/Button';
import { normalizeText } from '../utils/text';
import { Alert } from './ui/Alert';
import { Input } from './ui/Input';
import { useDebounce } from '../hooks/useDebounce';
import { SortButton } from './ui/SortButton';

const ITEMS_PER_PAGE = 12;

interface SearchPageProps {
    cityDataCache: Record<string, City[]>;
    loadCitiesForState: (state: string) => Promise<Record<string, City[]>>;
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    mainContentRef: React.RefObject<HTMLDivElement>;
    onFilterCountChange: (count: number) => void;
    isActive: boolean;
}

const SearchPage: React.FC<SearchPageProps> = ({
    cityDataCache,
    loadCitiesForState,
    isFiltersOpen,
    setIsFiltersOpen,
    mainContentRef,
    onFilterCountChange,
    isActive
}) => {
    const { accessibilitySettings, setAccessibilitySettings } = useSettings();
    const { viewMode } = accessibilitySettings;
    const { favoriteSearches, defaultSearch, isUserDataLoaded, cidadeRota, setCidadeRota } = useUserData();
    const { user } = useAuth();
    const { openModal } = useModal();

    const [isCityDataLoading, setIsCityDataLoading] = useState(false);
    const [isProximityLoading, setIsProximityLoading] = useState(false);
    const [proximityError, setProximityError] = useState<string | null>(null);

    const [localQuickSearch, setLocalQuickSearch] = useState('');
    const debouncedQuickSearch = useDebounce(localQuickSearch, 800);

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
        concursosPage,
        setConcursosPage,
        processosPage,
        setProcessosPage,
    } = useJobSearch(cityDataCache, defaultSearch, isUserDataLoaded, isCityDataLoading, ITEMS_PER_PAGE, isActive, debouncedQuickSearch);

    const [formKey, setFormKey] = useState(0);
    const [targetTab, setTargetTab] = useState<'concursos' | 'processos_seletivos' | null>(null);

    const prevIsDistanceFilterActive = useRef(criteria.distanciaRaio !== '');

    // When a new search is triggered by filter changes, scroll to the top.
    useEffect(() => {
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedCriteria, debouncedQuickSearch]);

    useEffect(() => {
        const wasActive = prevIsDistanceFilterActive.current;
        const isActive = criteria.distanciaRaio !== '';

    if (isActive && !wasActive) {
        setCriteria(prev => ({ ...prev, sort: 'distance-asc' }));
    } else if (!isActive && wasActive && (criteria.sort === 'distance-asc' || criteria.sort === 'distance-desc')) {
        setCriteria(prev => ({ ...prev, sort: 'alpha-asc' }));
    }
    prevIsDistanceFilterActive.current = isActive;
    }, [criteria.distanciaRaio, criteria.sort, setCriteria]);

    useEffect(() => {
        onFilterCountChange(calculateActiveFilters(criteria));
    }, [criteria, onFilterCountChange]);

    useEffect(() => {
        if (!criteria) return;

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
                .finally(() => setIsCityDataLoading(false));
            }
        }
    }, [criteria, cityDataCache, loadCitiesForState]);

    const handleClearFilters = useCallback(() => {
        setCriteria(systemDefaultValues);
        setLocalQuickSearch('');
    }, [setCriteria]);

    const handleProximitySearch = useCallback(async () => {
        const applyFilterWithCep = async (cep: string) => {
            setIsProximityLoading(true);
            setProximityError(null);
            try {
                const cleanCep = cep.replace(/\D/g, '');
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                if (!response.ok) throw new Error('CEP não encontrado. Verifique o número e tente novamente.');
                const data = await response.json();
                if (data.erro) throw new Error('CEP inválido. Verifique o número e tente novamente.');

                const { localidade: city, uf: state } = data;
                const stateUpper = state.toUpperCase();

                let cities = cityDataCache[stateUpper];
                if (!cities) {
                    const newCache = await loadCitiesForState(stateUpper);
                    cities = newCache[stateUpper];
                }

                const cityData = cities?.find(c => normalizeText(c.name) === normalizeText(city));
                if (cityData) {
                    setCriteria({
                        ...systemDefaultValues,
                        estado: stateUpper,
                        cidadeFiltro: cityData.name,
                        distanciaRaio: 500,
                        sort: 'distance-asc',
                        incluirVizinhos: true,
                    });
                } else {
                    throw new Error(`A cidade '${city}' do seu CEP não foi encontrada em nossos dados para cálculo de distância.`);
                }
            } catch (err: any) {
                setProximityError(err.message || 'Ocorreu um erro ao buscar por proximidade.');
            } finally {
                setIsProximityLoading(false);
            }
        };

        if (cidadeRota) {
            await applyFilterWithCep(cidadeRota);
        } else {
            openModal('cepInput', {
                onSave: async (newCep: string) => {
                    setCidadeRota(newCep);
                    await applyFilterWithCep(newCep);
                },
                isLoggedIn: !!user
            });
        }
    }, [cidadeRota, openModal, setCidadeRota, user, cityDataCache, loadCitiesForState, setCriteria]);


    const handleClearSingleFilter = useCallback((key: keyof SearchCriteria, value?: string) => {
        setCriteria(prev => {
            if (!prev) return systemDefaultValues;
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

    const setViewMode = (mode: ViewMode) => setAccessibilitySettings(prev => ({ ...prev, viewMode: mode }));

    const citiesForSelectedState = useMemo(() => {
        const state = criteria.estado;
        if (state.length === 2 && cityDataCache[state.toUpperCase()]) {
            return [...cityDataCache[state.toUpperCase()]].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [criteria.estado, cityDataCache]);

    const sortOptions = useMemo((): { value: OpenJobsSortOption; label: string }[] => {
        const baseOptions: { value: OpenJobsSortOption; label: string }[] = [ { value: 'alpha-asc', label: 'Órgão (A-Z)' }, { value: 'alpha-desc', label: 'Órgão (Z-A)' }, { value: 'deadline-asc', label: 'Prazo (Mais próximo)' }, { value: 'deadline-desc', label: 'Prazo (Mais distante)' }, { value: 'salary-desc', label: 'Maior Salário' }, { value: 'salary-asc', label: 'Menor Salário' }, { value: 'vacancies-desc', label: 'Mais Vagas' }, { value: 'vacancies-asc', label: 'Menos Vagas' }];
        if (debouncedCriteria.distanciaRaio) {
            return [ { value: 'distance-asc', label: 'Mais Perto' }, { value: 'distance-desc', label: 'Mais Longe' }, ...baseOptions ];
        }
        return baseOptions;
    }, [debouncedCriteria.distanciaRaio]);

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
        <div className="max-w-7xl mx-auto w-full flex flex-col flex-1">
        <div className="mb-4 space-y-3">
        <div className="flex flex-row items-center gap-2">
        <div className="flex-1">
        <Input
        value={localQuickSearch}
        onChange={(e) => setLocalQuickSearch(e.target.value)}
        placeholder="Busca rápida..."
        icon={<SearchIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
        />
        </div>
        <Button
        variant="secondary"
        size="icon"
        className="flex-shrink-0"
        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        aria-label={`Mudar para visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
        title={`Mudar para visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
        >
        {viewMode === 'grid' ? <ListIcon className="h-5 w-5" /> : <LayoutGridIcon className="h-5 w-5" />}
        </Button>
        <SortButton
        value={criteria.sort}
        onChange={(newSort: OpenJobsSortOption) => setCriteria(prev => ({ ...prev, sort: newSort }))}
        options={sortOptions}
        />
        </div>
        {proximityError && <Alert type="error" message={proximityError} />}
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
        </div>
        <ResultsList
        mainContentRef={mainContentRef}
        concursosResults={concursos} totalConcursos={totalConcursos} concursosPage={concursosPage} setConcursosPage={setConcursosPage}
        processosSeletivosResults={processosSeletivos} totalProcessos={totalProcessos} processosPage={processosPage} setProcessosPage={setProcessosPage}
        itemsPerPage={ITEMS_PER_PAGE} isLoading={isLoading} onClearFilters={handleClearFilters}
        targetTab={targetTab} setTargetTab={setTargetTab}
        hasActiveFilters={JSON.stringify(debouncedCriteria) !== JSON.stringify(systemDefaultValues) || debouncedQuickSearch !== ''}
        showLocationPillForStateJobs={showLocationPillForStateJobs} searchEstado={debouncedCriteria.estado}
        debouncedCriteria={debouncedCriteria}
        viewMode={viewMode || 'grid'}
        isActive={isActive}
        />

        <FiltersPanel
        isOpen={isFiltersOpen}
        onClose={handleCloseFilters}
        >
        <div className="p-4 sm:p-5 flex-1">
        <SearchForm
        {...searchFormProps}
        onProximitySearch={handleProximitySearch}
        isProximityLoading={isProximityLoading}
        proximityError={proximityError}
        cidadeRota={cidadeRota}
        />
        </div>
        </FiltersPanel>
        </div>
    );
};

export default SearchPage;