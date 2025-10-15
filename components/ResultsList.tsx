import React, { useState, useEffect, memo } from 'react';
import { ProcessedJob, OpenJobsSortOption } from '../types';
import { ResultCard } from './ResultCard';
import { Pagination } from './ui/Pagination';
import { EmptyStateDisplay } from './StateDisplays';
import { BriefcaseIcon, FilterIcon, SearchOffIcon } from './Icons';
import { Tabs } from './ui/Tabs';
import { Button } from './ui/Button';
import { SortButton } from './ui/SortButton';

interface ResultsListProps {
    concursosResults: ProcessedJob[], 
    totalConcursos: number, 
    concursosPage: number, 
    setConcursosPage: (page: number) => void,
    processosSeletivosResults: ProcessedJob[], 
    totalProcessos: number, 
    processosPage: number, 
    setProcessosPage: (page: number) => void,
    itemsPerPage: number,
    isLoading: boolean, 
    onClearFilters: () => void,
    targetTab: 'concursos' | 'processos_seletivos' | null, 
    setTargetTab: (tab: 'concursos' | 'processos_seletivos' | null) => void,
    hasActiveFilters: boolean, 
    showLocationPillForStateJobs: boolean, 
    searchEstado: string,
    mainContentRef: React.RefObject<HTMLDivElement>;
    sortOption: OpenJobsSortOption;
    onSortChange: (option: OpenJobsSortOption) => void;
}

export const ResultsList = memo(function ResultsList(props: ResultsListProps) {
    const { 
        concursosResults, totalConcursos, concursosPage, setConcursosPage, 
        processosSeletivosResults, totalProcessos, processosPage, setProcessosPage, 
        itemsPerPage, isLoading, onClearFilters, hasActiveFilters, targetTab, setTargetTab, 
        mainContentRef, sortOption, onSortChange, ...cardProps 
    } = props;
    const [activeTab, setActiveTab] = useState<'concursos' | 'processos_seletivos'>('concursos');

    useEffect(() => {
        if (targetTab) {
            setActiveTab(targetTab);
            setTargetTab(null);
        } else {
            if (totalConcursos > 0) setActiveTab('concursos');
            else if (totalProcessos > 0) setActiveTab('processos_seletivos');
        }
    }, [totalConcursos, totalProcessos, targetTab, setTargetTab]);

    const tabs = [
        { id: 'concursos' as const, label: 'Concursos', count: totalConcursos },
        { id: 'processos_seletivos' as const, label: 'Processos Seletivos', count: totalProcessos }
    ];

    const createPageChangeHandler = (setter: (page: number) => void) => (page: number) => {
        setter(page);
        mainContentRef.current?.scrollTo({ top: 0 });
    };

    const sortOptions: { value: OpenJobsSortOption; label: string }[] = [
        { value: 'alpha-asc', label: 'Órgão (A-Z)' },
        { value: 'alpha-desc', label: 'Órgão (Z-A)' },
        { value: 'deadline-asc', label: 'Prazo (Mais próximo)' },
        { value: 'deadline-desc', label: 'Prazo (Mais distante)' },
        { value: 'salary-desc', label: 'Maior Salário' },
        { value: 'salary-asc', label: 'Menor Salário' },
        { value: 'vacancies-desc', label: 'Mais Vagas' },
        { value: 'vacancies-asc', label: 'Menos Vagas' },
    ];

    const renderResults = (results: ProcessedJob[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {results.map((job, index) => (
                <div key={job.link} className="card-enter-animation" style={{ animationDelay: `${index * 50}ms` }}>
                    <ResultCard job={job} {...cardProps} />
                </div>
            ))}
        </div>
    );
    
    const showSkeleton = isLoading && totalConcursos === 0 && totalProcessos === 0;

    if (showSkeleton) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 skeleton-container">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 animate-pulse">
                        <div className="flex items-start gap-4">
                             <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700/80 rounded-md"></div>
                             <div className="flex-1 space-y-2">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-5/6"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700/80 rounded w-4/6"></div>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-full"></div>
                            <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-2/3"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    if (totalConcursos === 0 && totalProcessos === 0) {
        return hasActiveFilters ? (
            <EmptyStateDisplay
                icon={<SearchOffIcon className="h-12 w-12" />}
                title="Nenhum resultado encontrado"
                message="Sua busca com os filtros atuais não retornou nenhum concurso ou processo seletivo."
            >
                <Button onClick={onClearFilters}>
                    <FilterIcon className="h-5 w-5"/>
                    Limpar Filtros
                </Button>
            </EmptyStateDisplay>
        ) : (
            <EmptyStateDisplay
                icon={<BriefcaseIcon className="h-12 w-12" />}
                title="Nenhum concurso encontrado"
                message="Não há concursos ou processos seletivos abertos no momento. Volte mais tarde para novas oportunidades."
            />
        );
    }

    const activeResults = activeTab === 'concursos' ? concursosResults : processosSeletivosResults;
    const activeTotal = activeTab === 'concursos' ? totalConcursos : totalProcessos;
    const activePage = activeTab === 'concursos' ? concursosPage : processosPage;
    const activeSetPage = activeTab === 'concursos' ? setConcursosPage : setProcessosPage;

    return (
        <div className="flex flex-col">
            <div className="pb-8">
                <div className="mb-4 sm:mb-5">
                    <Tabs items={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as 'concursos' | 'processos_seletivos')} />
                </div>
                {renderResults(activeResults)}
            </div>
            
            {activeTotal > 0 && (
                <footer className="py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-center relative">
                    <Pagination currentPage={activePage} onPageChange={createPageChangeHandler(activeSetPage)} totalPages={Math.ceil(activeTotal / itemsPerPage)} />
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
    );
});
