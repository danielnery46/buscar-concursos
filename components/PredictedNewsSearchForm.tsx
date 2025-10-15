// NOTE: This component is generic. A better filename would be CategorizedSearchForm.tsx
import React, { useCallback, useState } from 'react';
import { SavedItem, FormattedSearchDetail } from '../types';
import { cn } from '../utils/helpers';
import { CheckIcon, FilterIcon, RedoIcon, SaveIcon, SaveOffIcon, StarIcon } from './Icons';
import { DefaultItemView, SavedItemsList } from './SavedItems';
import { FilterSummary } from './FilterSummary';
import { Tabs } from './ui/Tabs';
import { Button } from './ui/Button';
import { useSavedItems } from '../hooks/useSavedItems';


// =================================================================================================
// PROPS GENÉRICAS DO COMPONENTE
// =================================================================================================

interface CategorizedSearchFormProps<T extends SavedItem> {
    criteria: T;
    onClearFilters: () => void;
    onRunFavorite: (criteria: T) => void;
    
    favoriteItems: T[];
    setFavoriteItems: React.Dispatch<React.SetStateAction<T[]>>;
    defaultItem: T | null;
    setDefaultItem: React.Dispatch<React.SetStateAction<T | null>>;
    
    formatItem: (item: Partial<T>) => { title: string; details: FormattedSearchDetail[] };

    FilterFormComponent: React.FC<any>;
    filterFormComponentProps: any;
    
    summaryData: { 
        totalOpportunities: number;
        totalVacancies?: number;
        highestSalary?: number;
        opportunitiesLabel: string;
        opportunitiesIcon: React.ReactNode;
    } | null;
    isLoading: boolean;
}

// =================================================================================================
// SUB-COMPONENTES DE VISUALIZAÇÃO (genéricos)
// =================================================================================================

const FiltersView = React.memo(({ FilterFormComponent, filterFormComponentProps, handleFavorite, favoriteStatus, handleSaveDefault, defaultStatus, onClearFilters, summaryData, isLoading }: any) => (
    <div className="fade-in space-y-4">
        <FilterFormComponent {...filterFormComponentProps} />
        <div className="space-y-2 rounded-xl border bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleFavorite} disabled={favoriteStatus === 'success'} title={favoriteStatus === 'success' ? "Filtro favoritado!" : "Favoritar filtro atual"} className={cn('flex-1 gap-1.5', favoriteStatus === 'success' && 'bg-emerald-100 dark:bg-emerald-900/30 border-transparent text-emerald-700 dark:text-emerald-300')}>
                    {favoriteStatus === 'success' ? <CheckIcon className="h-5 w-5" /> : <StarIcon className="h-5 w-5 text-amber-500" />}
                    <span>{favoriteStatus === 'success' ? 'Salvo!' : 'Favoritar'}</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={handleSaveDefault} disabled={defaultStatus === 'success'} title={defaultStatus === 'success' ? "Salvo como padrão!" : "Salvar como filtro padrão"} className={cn('flex-1 gap-1.5', defaultStatus === 'success' && 'bg-emerald-100 dark:bg-emerald-900/30 border-transparent text-emerald-700 dark:text-emerald-300')}>
                    {defaultStatus === 'success' ? <CheckIcon className="h-5 w-5" /> : <SaveIcon className="h-5 w-5" />}
                    <span>{defaultStatus === 'success' ? 'Salvo!' : 'Padrão'}</span>
                </Button>
            </div>
            <Button variant="destructive" size="sm" onClick={onClearFilters} className="w-full gap-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-2 border-red-100 dark:border-red-900/50">
                <RedoIcon className="h-4 w-4" />
                <span>Limpar</span>
            </Button>
        </div>
        {summaryData && (
            <FilterSummary
                totalOpportunities={summaryData.totalOpportunities}
                totalVacancies={summaryData.totalVacancies}
                highestSalary={summaryData.highestSalary}
                isLoading={isLoading}
                opportunitiesLabel={summaryData.opportunitiesLabel}
                opportunitiesIcon={summaryData.opportunitiesIcon}
            />
        )}
    </div>
));

const FavoritesView = React.memo(({ favoriteItems, handleFavoriteClick, handleRemoveFavorite, handleRenameFavorite, handleClearFavorites, formatItem }: any) => (
    <div className="fade-in">
        <SavedItemsList
            items={favoriteItems}
            onRun={handleFavoriteClick}
            onRemove={handleRemoveFavorite}
            onRename={handleRenameFavorite}
            onClearAll={handleClearFavorites}
            formatItem={formatItem}
            emptyIcon={<StarIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />}
            emptyTitle="Seus filtros favoritos aparecerão aqui."
            emptyDescription="Salve um filtro para acessá-lo rapidamente."
        />
    </div>
));

const DefaultView = React.memo(({ defaultItem, handleRemoveDefault, formatItem }: any) => (
    <div className="fade-in">
        <DefaultItemView
            item={defaultItem}
            onRemove={handleRemoveDefault}
            formatItem={formatItem}
            emptyIcon={<SaveOffIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />}
            emptyTitle="Nenhum filtro padrão definido."
            emptyDescription="Defina um filtro na aba 'Filtros' para acesso rápido."
        />
    </div>
));

// =================================================================================================
// COMPONENTE GENÉRICO DE FORMULÁRIO DE BUSCA
// =================================================================================================

export function CategorizedSearchForm<T extends SavedItem>({
    criteria, onClearFilters, onRunFavorite,
    favoriteItems, setFavoriteItems, defaultItem, setDefaultItem,
    formatItem, FilterFormComponent, filterFormComponentProps,
    summaryData, isLoading
}: CategorizedSearchFormProps<T>) {

    const [activeView, setActiveView] = useState<'filters' | 'favorites' | 'default'>('filters');
    
    const {
        favoriteStatus,
        defaultStatus,
        handleFavorite,
        handleSaveDefault,
        handleRemoveDefault,
    } = useSavedItems<T>({
        setFavoriteItems: setFavoriteItems,
        setDefaultItem: setDefaultItem,
        criteria,
        onClear: onClearFilters,
    });

    const handleRemoveFavorite = useCallback((index: number) => {
        setFavoriteItems(prev => prev.filter((_, i) => i !== index));
    }, [setFavoriteItems]);

    const handleRenameFavorite = useCallback((index: number, newName: string) => {
        setFavoriteItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, name: newName } : item
            ) as T[]
        );
    }, [setFavoriteItems]);
    
    const handleClearFavorites = useCallback(() => {
        setFavoriteItems([]);
    }, [setFavoriteItems]);
    
    const handleFavoriteClick = useCallback((searchCriteria: T) => { 
        onRunFavorite(searchCriteria); 
        setActiveView('filters'); 
    }, [onRunFavorite, setActiveView]);

    const renderContent = () => {
        switch (activeView) {
            case 'favorites':
                return <FavoritesView {...{ favoriteItems, handleFavoriteClick, handleRemoveFavorite, handleRenameFavorite, handleClearFavorites, formatItem }} />;
            case 'default':
                return <DefaultView {...{ defaultItem, handleRemoveDefault, formatItem }} />;
            case 'filters':
            default:
                return <FiltersView {...{ FilterFormComponent, filterFormComponentProps, handleFavorite, favoriteStatus, handleSaveDefault, defaultStatus, onClearFilters, summaryData, isLoading }} />;
        }
    }

    const tabItems = [
        { id: 'filters', label: 'Filtros', icon: <FilterIcon className="h-5 w-5" /> },
        { id: 'favorites', label: 'Favoritos', icon: <StarIcon className="h-5 w-5" /> },
        { id: 'default', label: 'Padrão', icon: <SaveIcon className="h-5 w-5" /> },
    ] as const;

    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <Tabs items={tabItems} activeTab={activeView} onTabChange={(tabId) => setActiveView(tabId as 'filters' | 'favorites' | 'default')} type="secondary" />
            <div className="mt-6">
                {renderContent()}
            </div>
        </form>
    );
};
