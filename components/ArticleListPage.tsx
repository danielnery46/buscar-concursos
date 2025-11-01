import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PredictedCriteria, AccessibilitySettings, ViewMode, ArticleSortOption } from '../types';
import { formatPredictedCriteria } from '../utils/formatters';
import { FilterIcon, SearchOffIcon, LayoutGridIcon, ListIcon, SearchIcon } from './Icons';
import { CategorizedSearchForm } from './PredictedNewsSearchForm';
import { FiltersPanel } from './FiltersPanel';
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay';
import { ArticleCard } from './ArticleCard';
import { Pagination } from './ui/Pagination';
import { EmptyStateDisplay, InitialLoadErrorDisplay } from './StateDisplays';
import { Button } from './ui/Button';
import { PredictedNewsFormContent } from './FormContents';
import { useArticleSearch, calculatePredictedFilters } from '../hooks/useArticleSearch';
import { defaultPredictedValues } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from './ui/Input';
import { SortButton } from './ui/SortButton';

interface ArticleListPageProps {
    pageTitle: string;
    accessibilitySettings: AccessibilitySettings;
    isFiltersOpen: boolean;
    setIsFiltersOpen: (isOpen: boolean) => void;
    favoriteFilters: PredictedCriteria[];
    setFavoriteFilters: React.Dispatch<React.SetStateAction<PredictedCriteria[]>>;
    defaultFilter: PredictedCriteria | null;
    setDefaultFilter: React.Dispatch<React.SetStateAction<PredictedCriteria | null>>;
    mainContentRef: React.RefObject<HTMLDivElement>;
    emptyStateIcon: React.ReactNode;
    emptyStateTitle: string;
    emptyStateMessage: string;
    itemType: 'predicted' | 'news';
    onFilterCountChange: (count: number) => void;
    isUserDataLoaded: boolean;
    table: 'predicted_openings' | 'news_articles';
    availableSources: string[];
    isActive: boolean;
}

const ITEMS_PER_PAGE_ARTICLES = 12;

export const ArticleListPage: React.FC<ArticleListPageProps> = ({
    pageTitle,
    accessibilitySettings,
    isFiltersOpen,
    setIsFiltersOpen,
    favoriteFilters,
    setFavoriteFilters,
    defaultFilter,
    setDefaultFilter,
    mainContentRef,
    emptyStateIcon,
    emptyStateTitle,
    emptyStateMessage,
    itemType,
    onFilterCountChange,
    isUserDataLoaded,
    table,
    availableSources,
    isActive,
}) => {
    const { setAccessibilitySettings } = useSettings();
    const { viewMode = 'grid' } = accessibilitySettings;
    const [page, setPage] = useState(1);
    
    const [localQuickSearch, setLocalQuickSearch] = useState('');
    const debouncedQuickSearch = useDebounce(localQuickSearch, 800);
    
    const {
        criteria,
        setCriteria,
        debouncedCriteria,
        filteredItems,
        totalItems,
        isLoading,
        error,
    } = useArticleSearch(table, defaultFilter, isUserDataLoaded, page, ITEMS_PER_PAGE_ARTICLES, isActive, debouncedQuickSearch);
    
    const animationKey = useMemo(() => `${page}-${JSON.stringify(debouncedCriteria)}-${debouncedQuickSearch}-${viewMode}`, [page, debouncedCriteria, debouncedQuickSearch, viewMode]);
    
    useEffect(() => {
        onFilterCountChange(calculatePredictedFilters(criteria));
    }, [criteria, onFilterCountChange]);

    useEffect(() => {
        setPage(1);
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedCriteria, debouncedQuickSearch, mainContentRef]);
    
    const handleClearFilters = useCallback(() => {
        setCriteria(defaultPredictedValues);
        setLocalQuickSearch('');
    }, [setCriteria]);

    const handleClearSingleFilter = useCallback((key: keyof PredictedCriteria) => {
        if (key === 'name') return;
        setCriteria(prev => ({ ...prev, [key]: defaultPredictedValues[key] }));
    }, [setCriteria]);

    const handleRunFilter = useCallback((newCriteria: PredictedCriteria) => {
        setCriteria({ ...defaultPredictedValues, ...newCriteria });
        setIsFiltersOpen(false);
    }, [setIsFiltersOpen, setCriteria]);

    const handleCloseFilters = useCallback(() => setIsFiltersOpen(false), [setIsFiltersOpen]);
    
    const setViewMode = (mode: ViewMode) => setAccessibilitySettings(prev => ({ ...prev, viewMode: mode }));
    
    const onPageChange = (newPage: number) => {
        setPage(newPage);
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const hasActiveFilters = JSON.stringify(debouncedCriteria) !== JSON.stringify(defaultPredictedValues) || debouncedQuickSearch !== '';

    const articleSortOptions: { value: ArticleSortOption; label: string }[] = [
        { value: 'date-desc', label: 'Mais Recentes' },
        { value: 'date-asc', label: 'Mais Antigos' },
    ];
    
    const summaryIcon = useMemo(() => {
        if (React.isValidElement(emptyStateIcon)) {
            const colorClass = itemType === 'predicted' ? 'text-sky-500' : 'text-fuchsia-500';
            return React.cloneElement(emptyStateIcon as React.ReactElement<any>, { className: `h-5 w-5 ${colorClass}` });
        }
        return emptyStateIcon;
    }, [emptyStateIcon, itemType]);
    
    const summaryData = {
        totalOpportunities: totalItems,
        opportunitiesLabel: itemType === 'news' ? 'Notícias' : 'Previstos',
        opportunitiesIcon: summaryIcon,
    };

    if (error) {
        return <InitialLoadErrorDisplay title={`Erro ao Carregar ${pageTitle}`} message={error} />;
    }

    const layoutClasses = viewMode === 'grid'
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        : "flex flex-col gap-3";

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
                        onChange={(newSort: ArticleSortOption) => setCriteria(prev => ({ ...prev, sort: newSort }))}
                        options={articleSortOptions}
                    />
                </div>
                <ActiveFiltersDisplay<PredictedCriteria>
                    criteria={criteria}
                    defaultCriteria={defaultPredictedValues}
                    onClearFilter={handleClearSingleFilter}
                    onClearAllFilters={handleClearFilters}
                    favoriteItems={favoriteFilters}
                    onRunFavorite={handleRunFilter}
                    formatItem={formatPredictedCriteria}
                    accessibilitySettings={accessibilitySettings}
                />
            </div>
            {/* A CONDIÇÃO FOI MODIFICADA:
  Mostra o spinner se 'isLoading' for true, OU (||) se a aba 
  está ativa (isActive) E os itens ainda não foram carregados (totalItems === 0).
  Isso previne o "flash" de "Nenhum resultado".
*/}
{(isLoading || (isActive && totalItems === 0)) ? (
    <div className="flex-grow flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
    </div>
) : totalItems > 0 ? (
                <div className="flex flex-col flex-grow">
                    <div className="flex-grow">
                        <div key={animationKey} className={layoutClasses}>
                            {filteredItems.map((item, index) => (
                                <div key={item.link} className="card-enter-animation" style={{ animationDelay: `${index * 50}ms` }}>
                                    <ArticleCard 
                                        item={item}
                                        itemType={itemType}
                                        viewMode={viewMode}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {totalItems > ITEMS_PER_PAGE_ARTICLES ? (
                        <div className="pt-8 pb-8 flex items-center justify-center">
                            <Pagination currentPage={page} onPageChange={onPageChange} totalPages={Math.ceil(totalItems / ITEMS_PER_PAGE_ARTICLES)} />
                        </div>
                    ) : (
                        <div className="pb-8" />
                    )}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <EmptyStateDisplay
                        icon={hasActiveFilters ? <SearchOffIcon className="h-12 w-12" /> : emptyStateIcon}
                        title={hasActiveFilters ? "Nenhum resultado encontrado" : emptyStateTitle}
                        message={hasActiveFilters ? "Tente ajustar seus filtros para encontrar o que procura." : emptyStateMessage}
                    >
                        {hasActiveFilters && (
                            <Button onClick={handleClearFilters}>
                                <FilterIcon className="h-5 w-5"/>
                                Limpar Filtros
                            </Button>
                        )}
                    </EmptyStateDisplay>
                </div>
            )}
            <FiltersPanel isOpen={isFiltersOpen} onClose={handleCloseFilters}>
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <CategorizedSearchForm
                        criteria={criteria}
                        onClearFilters={handleClearFilters}
                        onRunFavorite={handleRunFilter}
                        favoriteItems={favoriteFilters}
                        setFavoriteItems={setFavoriteFilters}
                        defaultItem={defaultFilter}
                        setDefaultItem={setDefaultFilter}
                        formatItem={formatPredictedCriteria}
                        FilterFormComponent={PredictedNewsFormContent}
                        filterFormComponentProps={{ criteria, onCriteriaChange: setCriteria, availableSources }}
                        summaryData={summaryData}
                        isLoading={isLoading}
                    />
                </div>
            </FiltersPanel>
        </div>
    );
};