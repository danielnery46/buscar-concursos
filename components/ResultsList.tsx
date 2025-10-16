import React, { useState, useEffect, memo, useMemo } from 'react';
import { ProcessedJob, SearchCriteria } from '../types';
import { ResultCard } from './ResultCard';
import { Pagination } from './ui/Pagination';
import { EmptyStateDisplay } from './StateDisplays';
import { BriefcaseIcon, FilterIcon, SearchOffIcon } from './Icons';
import { Tabs } from './ui/Tabs';
import { Button } from './ui/Button';

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
    debouncedCriteria: SearchCriteria;
}

export const ResultsList = memo(function ResultsList(props: ResultsListProps) {
    const { 
        concursosResults, totalConcursos, concursosPage, setConcursosPage, 
        processosSeletivosResults, totalProcessos, processosPage, setProcessosPage, 
        itemsPerPage, isLoading, onClearFilters, hasActiveFilters, targetTab, setTargetTab, 
        mainContentRef, debouncedCriteria, ...cardProps 
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
    
    const animationKey = useMemo(() => {
        const pageKey = activeTab === 'concursos' ? concursosPage : processosPage;
        return `${activeTab}-${pageKey}-${JSON.stringify(debouncedCriteria)}`;
    }, [activeTab, concursosPage, processosPage, debouncedCriteria]);

    const tabs = [
        { id: 'concursos' as const, label: 'Concursos', count: totalConcursos },
        { id: 'processos_seletivos' as const, label: 'Processos Seletivos', count: totalProcessos }
    ];

    const createPageChangeHandler = (setter: (page: number) => void) => (page: number) => {
        setter(page);
        mainContentRef.current?.scrollTo({ top: 0 });
    };

    const activeResults = activeTab === 'concursos' ? concursosResults : processosSeletivosResults;
    const activeTotal = activeTab === 'concursos' ? totalConcursos : totalProcessos;
    const activePage = activeTab === 'concursos' ? concursosPage : processosPage;
    const activeSetPage = activeTab === 'concursos' ? setConcursosPage : setProcessosPage;

    if (isLoading && totalConcursos === 0 && totalProcessos === 0) {
        return (
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
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

    return (
        <div className="flex flex-col flex-grow">
            <div className="pb-8 flex-grow">
                <div className="mb-4 sm:mb-5">
                    <Tabs items={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as 'concursos' | 'processos_seletivos')} />
                </div>
                <div key={animationKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {activeResults.map((job, index) => (
                        <div key={job.link} className="card-enter-animation" style={{ animationDelay: `${index * 50}ms` }}>
                            <ResultCard job={job} {...cardProps} />
                        </div>
                    ))}
                </div>
            </div>
            
            {activeTotal > itemsPerPage && (
                <footer className="py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-center relative">
                    <Pagination currentPage={activePage} onPageChange={createPageChangeHandler(activeSetPage)} totalPages={Math.ceil(activeTotal / itemsPerPage)} />
                </footer>
            )}
        </div>
    );
});