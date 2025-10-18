import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PredictedCriteria, AccessibilitySettings } from '../types';
import { formatPredictedCriteria } from '../utils/formatters';
import { FilterIcon, SearchOffIcon } from './Icons';
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
    const [page, setPage] = useState(1);
    const {
        criteria,
        setCriteria,
        debouncedCriteria,
        filteredItems,
        totalItems,
        isLoading,
        error,
    } = useArticleSearch(table, defaultFilter, isUserDataLoaded, page, ITEMS_PER_PAGE_ARTICLES, isActive);
    
    const prevIsActive = useRef(isActive);
    useEffect(() => {
        prevIsActive.current = isActive;
    });
    // This helps prevent a flicker of the "empty state" when a tab becomes active
    // before the loading state from the hook has propagated.
    const isJustActivated = isActive && !prevIsActive.current;

    const animationKey = useMemo(() => `${page}-${JSON.stringify(debouncedCriteria)}`, [page, debouncedCriteria]);
    
    useEffect(() => {
        onFilterCountChange(calculatePredictedFilters(criteria));
    }, [criteria, onFilterCountChange]);

    useEffect(() => {
        setPage(1);
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedCriteria, mainContentRef]);
    
    const handleClearFilters = useCallback(() => setCriteria(defaultPredictedValues), [setCriteria]);

    const handleClearSingleFilter = useCallback((key: keyof PredictedCriteria) => {
        if (key === 'name') return;
        setCriteria(prev => ({ ...prev, [key]: defaultPredictedValues[key] }));
    }, [setCriteria]);

    const handleRunFilter = useCallback((newCriteria: PredictedCriteria) => {
        setCriteria({ ...defaultPredictedValues, ...newCriteria });
        setIsFiltersOpen(false);
    }, [setIsFiltersOpen, setCriteria]);

    const handleCloseFilters = useCallback(() => setIsFiltersOpen(false), [setIsFiltersOpen]);
    
    const onPageChange = (newPage: number) => {
        setPage(newPage);
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const hasActiveFilters = JSON.stringify(debouncedCriteria) !== JSON.stringify(defaultPredictedValues);
    
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

    return (
        <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
            <div className="w-full items-start flex-grow flex flex-col">
                 <main className="w-full flex-grow flex flex-col">
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
                    {isLoading || isJustActivated ? (
                        <div className="flex-grow flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : totalItems > 0 ? (
                        <div className="flex flex-col flex-grow">
                            <div className="pb-8 flex-grow">
                                <div key={animationKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                    {filteredItems.map((item, index) => (
                                        <div key={item.link} className="card-enter-animation" style={{ animationDelay: `${index * 50}ms` }}>
                                            <ArticleCard item={item} itemType={itemType} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {totalItems > ITEMS_PER_PAGE_ARTICLES && (
                                <footer className="mt-auto py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-center relative">
                                    <Pagination currentPage={page} onPageChange={onPageChange} totalPages={Math.ceil(totalItems / ITEMS_PER_PAGE_ARTICLES)} />
                                </footer>
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
                 </main>
            </div>
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