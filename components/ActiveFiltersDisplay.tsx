import React, { useMemo, memo } from 'react';
import { AccessibilitySettings, FormattedSearchDetail } from '../types';
import { CloseIcon, RedoIcon, StarIcon } from './Icons';

interface ActiveFiltersDisplayProps<T extends object> {
    criteria: T;
    defaultCriteria: T;
    favoriteItems: T[];
    onClearFilter: (key: keyof T, value?: any) => void;
    onClearAllFilters: () => void;
    onRunFavorite: (criteria: T) => void;
    formatItem: (item: Partial<T>) => { title: string; details: FormattedSearchDetail[] };
    accessibilitySettings: AccessibilitySettings;
}

const ActiveFiltersDisplayComponent = <T extends object>({
    criteria,
    defaultCriteria,
    favoriteItems,
    onClearFilter,
    onClearAllFilters,
    onRunFavorite,
    formatItem,
    accessibilitySettings,
}: ActiveFiltersDisplayProps<T>): React.ReactElement | null => {
    const hasActiveFilters = useMemo(() => JSON.stringify(criteria) !== JSON.stringify(defaultCriteria), [criteria, defaultCriteria]);

    const activeFiltersNode = useMemo(() => {
        if (!hasActiveFilters) return null;
        
        const { details: filterDetails } = formatItem(criteria);
        
        return (
            <div className="p-3 bg-indigo-50 dark:bg-gray-800/50 border border-indigo-200 dark:border-gray-800 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex flex-wrap gap-2 flex-1 items-center">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros Ativos:</span>
                        {filterDetails.map((filter, index) => (
                            <div key={`${filter.key}-${index}`} className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full pl-3 pr-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                                {filter.text}
                                <button onClick={() => onClearFilter(filter.key as any, filter.value)} className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400">
                                    <CloseIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-indigo-200 dark:border-gray-700 pt-3 sm:pt-0 sm:pl-3 -mx-3 sm:mx-0 px-3 sm:px-0">
                        <button onClick={onClearAllFilters} title="Limpar todos os filtros" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800/50 focus-visible:ring-red-500"><RedoIcon className="h-4 w-4"/> Limpar</button>
                    </div>
                </div>
            </div>
        );
    }, [hasActiveFilters, criteria, onClearFilter, onClearAllFilters, formatItem]);

    const favoritesNode = useMemo(() => {
        if (!((accessibilitySettings.showQuickAccess ?? true) && favoriteItems.length > 0)) return null;

        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Buscas Favoritas</h3>
                <div className="flex flex-wrap gap-2">
                    {favoriteItems.map((fav, index) => {
                        const { title, details } = formatItem(fav);
                        const detailsText = details.map(d => d.text).join(', ') || 'Busca sem filtros adicionais';
                        return (
                            <button
                                key={index}
                                onClick={() => onRunFavorite(fav)}
                                title={detailsText}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <StarIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <span className="truncate max-w-48">{title}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }, [accessibilitySettings.showQuickAccess, favoriteItems, onRunFavorite, formatItem]);

    if (!activeFiltersNode && !favoritesNode) {
        return null;
    }

    return (
        <div className="mb-4 sm:mb-5">
            {activeFiltersNode ? activeFiltersNode : favoritesNode}
        </div>
    );
};

export const ActiveFiltersDisplay = memo(ActiveFiltersDisplayComponent) as <T extends object>(props: ActiveFiltersDisplayProps<T>) => React.ReactElement | null;
