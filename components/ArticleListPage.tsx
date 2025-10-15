import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProcessedPredictedJob, PredictedCriteria, AccessibilitySettings, ArticleSortOption } from '../types';
import { formatPredictedCriteria } from '../utils/formatters';
import { FilterIcon, SearchOffIcon } from './Icons';
import { CategorizedSearchForm } from './PredictedNewsSearchForm';
import { FiltersPanel } from './FiltersPanel';
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay';
import { ArticleCard } from './ArticleCard';
import { Pagination } from './ui/Pagination';
import { EmptyStateDisplay } from './StateDisplays';
import { Button } from './ui/Button';
import { SortButton } from './ui/SortButton';
import { PredictedNewsFormContent } from './FormContents';
import { useArticleSearch, calculatePredictedFilters } from '../hooks/useArticleSearch';
import { defaultPredictedValues } from '../constants';

interface ArticleListPageProps {
    pageTitle: string;
    items: ProcessedPredictedJob[];
    isLoading: boolean;
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
    sortOption: ArticleSortOption;
    onSortChange: (option: ArticleSortOption) => void;
    onFilterCountChange: (count: number) => void;
    isUserDataLoaded: boolean;
}

const ITEMS_PER_PAGE_ARTICLES = 12;

export const ArticleListPage: React.FC<ArticleListPageProps> = ({
    items,
    isLoading: propsIsLoading,
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
    sortOption,
    onSortChange,
    onFilterCountChange,
    isUserDataLoaded,
}) => {
    const {
        criteria,
        setCriteria,
        debouncedCriteria,
        filteredItems,
        isLoading: isFiltering,
    } = useArticleSearch(items, defaultFilter, isUserDataLoaded);
    const [page, setPage] = useState(1);
    
    useEffect(() => {
        onFilterCountChange(calculatePredictedFilters(criteria));
    }, [criteria, onFilterCountChange]);

    const availableSources = useMemo(() => {
        const sources = new Set<string>();
        items.forEach(item => {
            if (item.source) {
                sources.add(item.source);
            }
        });
        return Array.from(sources).sort();
    }, [items]);

    useEffect(() => {
        setPage(1);
    }, [debouncedCriteria, sortOption]);

    useEffect(() => {
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedCriteria, mainContentRef]);
    
    const isLoading = propsIsLoading || isFiltering;

    const sortedItems = useMemo(() => {
        const sorted = [...filteredItems];
        if (sortOption === 'date-asc') {
            return sorted.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
        }
        // default to date-desc
        return sorted.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
    }, [filteredItems, sortOption]);

    const paginatedItems = useMemo(() => {
        return sortedItems.slice((page - 1) * ITEMS_PER_PAGE_ARTICLES, page * ITEMS_PER_PAGE_ARTICLES);
    }, [sortedItems, page]);

    const handleClearFilters = useCallback(() => {
        setCriteria(defaultPredictedValues);
    }, [setCriteria]);

    const handleClearSingleFilter = useCallback((key: keyof PredictedCriteria) => {
        if (key === 'name') return;
        setCriteria(prev => ({ ...prev, [key]: defaultPredictedValues[key] }));
    }, [setCriteria]);

    const handleRunFilter = useCallback((newCriteria: PredictedCriteria) => {
        setCriteria({ ...defaultPredictedValues, ...newCriteria });
        setIsFiltersOpen(false);
    }, [setIsFiltersOpen, setCriteria]);

    const handleCloseFilters = useCallback(() => {
        setIsFiltersOpen(false);
    }, [setIsFiltersOpen]);
    
    const onPageChange = (newPage: number) => {
        setPage(newPage);
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const hasActiveFilters = JSON.stringify(debouncedCriteria) !== JSON.stringify(defaultPredictedValues);

    const summaryIcon = useMemo(() => {
        if (React.isValidElement(emptyStateIcon)) {
            const colorClass = itemType === 'predicted' 
                ? 'text-sky-500' 
                : 'text-fuchsia-500';
            
            return React.cloneElement(emptyStateIcon as React.ReactElement<any>, {
                className: `h-5 w-5 ${colorClass}`
            });
        }
        return emptyStateIcon;
    }, [emptyStateIcon, itemType]);
    
    const summaryData = {
        totalOpportunities: filteredItems.length,
        opportunitiesLabel: itemType === 'news' ? 'Notícias' : 'Previstos',
        opportunitiesIcon: summaryIcon,
    };

    const sortOptions: { value: ArticleSortOption; label: string }[] = [
        { value: 'date-desc', label: 'Mais Recentes' },
        { value: 'date-asc', label: 'Mais Antigos' },
    ];

    const showSkeleton = isLoading && filteredItems.length === 0;

    return (
        <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
            <div className="w-full items-start flex-grow flex flex-col">
                 <main className="w-full flex-grow flex flex-col">
                    {!propsIsLoading && (
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
                    )}
                    {showSkeleton ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 skeleton-container">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 animate-pulse">
                                    <div className="space-y-3">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700/80 rounded w-1/3"></div>
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-full"></div>
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-5/6"></div>
                                    </div>
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="h-6 bg-gray-200 dark:bg-gray-700/80 rounded-full w-20"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="flex flex-col">
                            <div className="pb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                    {paginatedItems.map((item, index) => (
                                        <div key={item.link} className="card-enter-animation" style={{ animationDelay: `${index * 50}ms` }}>
                                            <ArticleCard 
                                                item={item} 
                                                itemType={itemType}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {filteredItems.length > 0 && (
                                <footer className="py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-center relative">
                                    <Pagination
                                        currentPage={page}
                                        onPageChange={onPageChange}
                                        totalPages={Math.ceil(filteredItems.length / ITEMS_PER_PAGE_ARTICLES)}
                                    />
                                    <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2">
                                        <SortButton
                                            options={sortOptions}
                                            value={sortOption}
                                            onChange={onSortChange}
                                        />
                                    </div>
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
             <FiltersPanel
                isOpen={isFiltersOpen}
                onClose={handleCloseFilters}
             >
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