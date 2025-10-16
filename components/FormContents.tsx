import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { City, SearchCriteria, PredictedCriteria, Estado, OpenJobsSortOption, ArticleSortOption } from '../types';
import { NIVEIS_ESCOLARIDADE, ESTADOS_POR_REGIAO, years, months, monthNames } from '../constants';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency } from '../utils/formatters';
import {
    AlertTriangleIcon,
    BriefcaseIcon,
    CalendarIcon,
    LocationIcon,
    DocumentTextIcon,
    SlidersIcon,
    TypeIcon,
    SortIcon,
} from './Icons';
import { Accordion } from './ui/Accordion';
import { CustomCheckbox } from './ui/Checkbox';
import { Slider } from './ui/Slider';

// =================================================================================================
// CONTEÚDO DE FORMULÁRIO REUTILIZÁVEL PARA 'Abertos'
// =================================================================================================
interface SearchFormContentProps {
    criteria: SearchCriteria;
    onCriteriaChange: React.Dispatch<React.SetStateAction<SearchCriteria>>;
    isCityDataLoading: boolean;
    cities: City[];
    isModalView?: boolean;
}

export const SearchFormContent: React.FC<SearchFormContentProps> = memo(({ criteria, onCriteriaChange, isCityDataLoading, cities, isModalView = false }) => {
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    
    // --- Entradas com Debounce ---
    const [localKeyword, setLocalKeyword] = useState(criteria.palavraChave);
    const debouncedKeyword = useDebounce(localKeyword, 500);

    // Sincroniza o estado local se a prop de critérios pai mudar (ex: carregar um favorito ou limpar filtros)
    useEffect(() => {
        if (criteria.palavraChave !== localKeyword) {
            setLocalKeyword(criteria.palavraChave);
        }
    }, [criteria.palavraChave]);

    // Propaga as mudanças com debounce para o componente pai
    useEffect(() => {
        if (debouncedKeyword !== criteria.palavraChave) {
            onCriteriaChange(prev => ({ ...prev, palavraChave: debouncedKeyword }));
        }
    // A dependência `criteria.palavraChave` é intencionalmente omitida para evitar um loop de re-renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedKeyword, onCriteriaChange]);


    const toggleAccordion = (section: string) => {
        setOpenAccordions(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newState = e.target.value;
        onCriteriaChange(prev => ({
            ...prev,
            estado: newState,
            cidadeFiltro: '',
            distanciaRaio: '',
            incluirVizinhos: newState.length === 2 ? prev.incluirVizinhos : false,
        }));
    };

    const handleEscolaridadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        onCriteriaChange(prev => {
            const newEscolaridade = checked
                ? [...prev.escolaridade, value]
                : prev.escolaridade.filter(item => item !== value);
            return { ...prev, escolaridade: newEscolaridade };
        });
    };

    const isStateSelected = criteria.estado.length === 2;
    const isCityFilterActive = criteria.cidadeFiltro.trim() !== '';
    const isDistanceFilterActive = criteria.distanciaRaio !== '';

    // Gerencia a ordenação automaticamente com base no filtro de distância
    const prevIsDistanceFilterActive = useRef(isDistanceFilterActive);
    useEffect(() => {
        const wasActive = prevIsDistanceFilterActive.current;
        const isActive = criteria.distanciaRaio !== '';

        // Se o filtro de distância foi recém-ativado, define a ordenação para 'Mais Perto'
        if (isActive && !wasActive) {
            onCriteriaChange(prev => ({ ...prev, sort: 'distance-asc' }));
        } 
        // Se o filtro de distância foi desativado e a ordenação era por distância, reseta
        else if (!isActive && wasActive && (criteria.sort === 'distance-asc' || criteria.sort === 'distance-desc')) {
            onCriteriaChange(prev => ({ ...prev, sort: 'alpha-asc' }));
        }

        // Atualiza o estado anterior para a próxima renderização
        prevIsDistanceFilterActive.current = isActive;
    }, [criteria.distanciaRaio, criteria.sort, onCriteriaChange]);
    
    const sortOptions = useMemo(() => {
        const baseOptions: { value: OpenJobsSortOption; label: string }[] = [
            { value: 'alpha-asc', label: 'Órgão (A-Z)' },
            { value: 'alpha-desc', label: 'Órgão (Z-A)' },
            { value: 'deadline-asc', label: 'Prazo (Mais próximo)' },
            { value: 'deadline-desc', label: 'Prazo (Mais distante)' },
            { value: 'salary-desc', label: 'Maior Salário' },
            { value: 'salary-asc', label: 'Menor Salário' },
            { value: 'vacancies-desc', label: 'Mais Vagas' },
            { value: 'vacancies-asc', label: 'Menos Vagas' },
        ];
        if (isDistanceFilterActive) {
            return [
                { value: 'distance-asc', label: 'Mais Perto' },
                { value: 'distance-desc', label: 'Mais Longe' },
                ...baseOptions,
            ];
        }
        return baseOptions;
    }, [isDistanceFilterActive]);

    const locationSummary = useMemo(() => {
        if (criteria.estado === 'brasil') return 'Brasil';
        if (criteria.estado === 'nacional') return 'Nacional';
        if (criteria.estado.startsWith('regiao-')) return `Região ${criteria.estado.replace('regiao-', '')}`;
        if (isStateSelected) {
            if (criteria.cidadeFiltro) {
                if(criteria.distanciaRaio) return `${criteria.cidadeFiltro} +${criteria.distanciaRaio}km`;
                return `${criteria.cidadeFiltro}, ${criteria.estado}`;
            }
            return criteria.incluirVizinhos ? `${criteria.estado} + Vizinhos` : criteria.estado;
        }
        return null;
    }, [criteria.estado, criteria.cidadeFiltro, criteria.incluirVizinhos, criteria.distanciaRaio, isStateSelected]);

    const salarySummary = useMemo(() => {
        const parts = [];
        if(criteria.salarioMinimo) parts.push(`> ${formatCurrency(criteria.salarioMinimo)}`);
        if(criteria.vagasMinimas) parts.push(`> ${criteria.vagasMinimas} vagas`);
        return parts.join(' / ');
    }, [criteria.salarioMinimo, criteria.vagasMinimas]);

    const roleSummary = useMemo(() => {
        const parts = [];
        if(criteria.palavraChave) parts.push(`"${criteria.palavraChave}"`);
        if(criteria.escolaridade.length > 0) parts.push(`${criteria.escolaridade.length} nível(is)`);
        return parts.join(' / ');
    }, [criteria.palavraChave, criteria.escolaridade]);

    return (
        <div className={!isModalView ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-sm" : ""}>
            <Accordion title="Localização" icon={<LocationIcon className="h-5 w-5" />} isOpen={openAccordions.includes('location')} onToggle={() => toggleAccordion('location')} summary={locationSummary}>
                <div>
                    <label htmlFor="abrangencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Abrangência</label>
                    <div className="relative">
                        <select id="abrangencia" value={criteria.estado} onChange={handleEstadoChange} className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]">
                            <optgroup label="Geral"><option value="brasil">Todo o Brasil</option><option value="nacional">Apenas âmbito Nacional</option></optgroup>
                            <optgroup label="Por região">{Object.keys(ESTADOS_POR_REGIAO).map((regiao) => (<option key={`regiao-${regiao}`} value={`regiao-${regiao.toLowerCase()}`}>{`Região ${regiao}`}</option>))}</optgroup>
                            {Object.entries(ESTADOS_POR_REGIAO).map(([regiao, estados]: [string, Estado[]]) => (<optgroup label={regiao} key={regiao}>{estados.map((uf: Estado) => (<option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>))}</optgroup>))}
                        </select>
                    </div>
                </div>
                {isStateSelected && (
                <div className="space-y-5 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700/60">
                    <div className="relative">
                        <label htmlFor="cidadeFiltro" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cidade</label>
                        <select id="cidadeFiltro" value={criteria.cidadeFiltro} onChange={(e) => onCriteriaChange(prev => ({...prev, cidadeFiltro: e.target.value }))} disabled={isCityDataLoading || cities.length === 0} className="w-full text-base pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]">
                            <option value="">{isCityDataLoading ? 'Carregando cidades...' : 'Todas as cidades'}</option>{cities.map(city => (<option key={city.normalizedName} value={city.name}>{city.name}</option>))}
                        </select>
                    </div>
                    {isCityFilterActive && (
                        <div>
                            <Slider label="Raio de Distância" id="distanciaRaio" value={criteria.distanciaRaio} onChange={(v) => onCriteriaChange(prev => ({...prev, distanciaRaio: v }))} min={0} max={500} step={10} unit="km" valueSuffix=" km" disabled={isCityDataLoading} numberInput={true} />
                            {isDistanceFilterActive && (<div className="mt-3 p-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-400 dark:border-amber-500 flex items-start gap-2 rounded-r-md"><div className="flex-shrink-0 pt-0.5"><AlertTriangleIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" /></div><p className="flex-1 text-justify hyphens-auto"><strong>Atenção:</strong> A distância é calculada em linha reta e funciona apenas para vagas com cidade definida.</p></div>)}
                        </div>
                    )}
                    <div><button type="button" onClick={() => onCriteriaChange(prev => ({ ...prev, incluirVizinhos: !prev.incluirVizinhos }))} disabled={!isStateSelected} className={`w-full text-center px-2 py-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 ${!isStateSelected ? "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed" : criteria.incluirVizinhos ? "bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`} aria-pressed={criteria.incluirVizinhos}>Incluir concursos de estados vizinhos</button></div>
                </div>
                )}
            </Accordion>
            
            <Accordion title="Salário e Vagas" icon={<SlidersIcon className="h-5 w-5" />} isOpen={openAccordions.includes('salary')} onToggle={() => toggleAccordion('salary')} summary={salarySummary}>
                 <Slider label="Salário Mínimo" id="salarioMinimo" value={criteria.salarioMinimo} onChange={(v) => onCriteriaChange(prev => ({...prev, salarioMinimo: v }))} min={0} max={15000} step={500} unit="valor" valuePrefix="A partir de R$ " numberInput={true}/>
                 <Slider label="Vagas Mínimas" id="vagasMinimas" value={criteria.vagasMinimas} onChange={(v) => onCriteriaChange(prev => ({...prev, vagasMinimas: v }))} min={0} max={100} step={1} unit="quantidade" valueSuffix={Number(criteria.vagasMinimas) > 1 ? ' vagas' : ' vaga'} numberInput={true}/>
            </Accordion>

            <Accordion title="Palavra-chave e Escolaridade" icon={<BriefcaseIcon className="h-5 w-5" />} isOpen={openAccordions.includes('role')} onToggle={() => toggleAccordion('role')} summary={roleSummary}>
                <div className="relative"><label htmlFor="palavraChave" className="sr-only">Palavra-chave no título</label><input type="text" id="palavraChave" value={localKeyword} onChange={(e) => setLocalKeyword(e.target.value)} placeholder="Palavra-chave no título" className="w-full text-base px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nível de escolaridade</label><div className="grid gap-2 grid-cols-2">{NIVEIS_ESCOLARIDADE.filter((n: string) => n !== 'Qualquer').map((nivel: string) => (<CustomCheckbox key={nivel} id={`esc-${nivel.replace(/\s/g, '-')}`} value={nivel} checked={criteria.escolaridade.includes(nivel)} onChange={handleEscolaridadeChange}>{nivel.replace('Nível ', '')}</CustomCheckbox>))}</div></div>
            </Accordion>
            <Accordion title="Ordenação" icon={<SortIcon className="h-5 w-5" />} isOpen={openAccordions.includes('sort')} onToggle={() => toggleAccordion('sort')} summary={sortOptions.find(o => o.value === criteria.sort)?.label}>
                <div>
                    <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ordenar resultados por</label>
                    <div className="relative">
                        <select
                            id="sort"
                            value={criteria.sort}
                            onChange={(e) => onCriteriaChange(prev => ({ ...prev, sort: e.target.value as OpenJobsSortOption }))}
                            className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Accordion>
        </div>
    );
});

// =================================================================================================
// CONTEÚDO DE FORMULÁRIO REUTILIZÁVEL PARA 'Previstos' & 'Noticias'
// =================================================================================================

interface PredictedNewsFormContentProps {
    criteria: PredictedCriteria;
    onCriteriaChange: React.Dispatch<React.SetStateAction<PredictedCriteria>>;
    availableSources?: string[];
    isModalView?: boolean;
}

const articleSortOptions: { value: ArticleSortOption; label: string }[] = [
    { value: 'date-desc', label: 'Mais Recentes' },
    { value: 'date-asc', label: 'Mais Antigos' },
];

export const PredictedNewsFormContent: React.FC<PredictedNewsFormContentProps> = memo(({ criteria, onCriteriaChange, availableSources, isModalView = false }) => {
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    const [localSearchTerm, setLocalSearchTerm] = useState(criteria.searchTerm);
    const debouncedSearchTerm = useDebounce(localSearchTerm, 1000);

    useEffect(() => {
        if (criteria.searchTerm !== localSearchTerm) {
            setLocalSearchTerm(criteria.searchTerm);
        }
    }, [criteria.searchTerm]);

    useEffect(() => {
        if (debouncedSearchTerm !== criteria.searchTerm) {
            onCriteriaChange(prev => ({ ...prev, searchTerm: debouncedSearchTerm }));
        }
    // A dependência `criteria.searchTerm` é intencionalmente omitida para evitar um loop de re-renderização ao limpar filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchTerm, onCriteriaChange]);
    
    const toggleAccordion = (section: string) => {
        setOpenAccordions(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const searchSummary = useMemo(() => {
        if(criteria.location === 'brasil' && !criteria.searchTerm) return null;
        let locationText = criteria.location.toUpperCase();
        if (criteria.location.startsWith('regiao-')) locationText = `Região ${criteria.location.replace('regiao-', '')}`;
        else if (criteria.location === 'brasil') locationText = 'Brasil';
        
        const parts = [];
        if (criteria.searchTerm) parts.push(`"${criteria.searchTerm}"`);
        if (criteria.location !== 'brasil') parts.push(locationText);
        return parts.join(' em ');
    }, [criteria.searchTerm, criteria.location]);

    const dateSummary = useMemo(() => {
        const parts = [];
        if (criteria.month !== 'todos') parts.push(monthNames[parseInt(criteria.month, 10) - 1]);
        if (criteria.year !== 'todos') parts.push(criteria.year);
        return parts.join('/');
    }, [criteria.month, criteria.year]);

    const sourcesSummary = useMemo(() => {
        if (!criteria.sources || criteria.sources.length === 0) return null;
        if (criteria.sources.length === 1) return criteria.sources[0];
        return `${criteria.sources.length} fontes`;
    }, [criteria.sources]);

    return (
        <div className={!isModalView ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-sm" : ""}>
            <Accordion title="Busca e Localização" icon={<TypeIcon className="h-5 w-5" />} isOpen={openAccordions.includes('location')} onToggle={() => toggleAccordion('location')} summary={searchSummary}>
                <div>
                    <label htmlFor="searchTerm-predicted" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Palavra-chave</label>
                    <div className="relative">
                        <input type="text" id="searchTerm-predicted" value={localSearchTerm} onChange={e => setLocalSearchTerm(e.target.value)} placeholder="Buscar no título..." className="w-full text-base px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
                <div>
                    <label htmlFor="location-predicted" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Localização</label>
                    <div className="relative">
                        <select id="location-predicted" value={criteria.location} onChange={e => onCriteriaChange(prev => ({ ...prev, location: e.target.value }))} className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]">
                            <option value="brasil">Todo o Brasil</option>
                            <optgroup label="Por região">{Object.keys(ESTADOS_POR_REGIAO).map((regiao) => (<option key={`regiao-${regiao}`} value={`regiao-${regiao.toLowerCase()}`}>{`Região ${regiao}`}</option>))}</optgroup>
                            {Object.entries(ESTADOS_POR_REGIAO).map(([regiao, estados]: [string, Estado[]]) => (
                                <optgroup label={regiao} key={regiao}>{estados.map((uf: Estado) => <option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>)}</optgroup>
                            ))}
                        </select>
                    </div>
                </div>
            </Accordion>
            <Accordion title="Data" icon={<CalendarIcon className="h-5 w-5" />} isOpen={openAccordions.includes('date')} onToggle={() => toggleAccordion('date')} summary={dateSummary}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="year-predicted" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ano</label>
                        <div className="relative">
                            <select id="year-predicted" value={criteria.year} onChange={e => onCriteriaChange(prev => ({ ...prev, year: e.target.value }))} className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]">
                                <option value="todos">Todos</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="month-predicted" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mês</label>
                        <div className="relative">
                            <select id="month-predicted" value={criteria.month} onChange={e => onCriteriaChange(prev => ({ ...prev, month: e.target.value }))} className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]">
                                <option value="todos">Todos</option>
                                {months.map(m => <option key={m} value={m}>{monthNames[m - 1]}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </Accordion>
             <Accordion title="Ordenação" icon={<SortIcon className="h-5 w-5" />} isOpen={openAccordions.includes('sort')} onToggle={() => toggleAccordion('sort')} summary={articleSortOptions.find(o => o.value === criteria.sort)?.label}>
                <div>
                    <label htmlFor="sort-predicted" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ordenar resultados por</label>
                    <div className="relative">
                        <select
                            id="sort-predicted"
                            value={criteria.sort}
                            onChange={e => onCriteriaChange(prev => ({ ...prev, sort: e.target.value as ArticleSortOption }))}
                            className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3e%3cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_0.5rem]"
                        >
                            {articleSortOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Accordion>
            {!isModalView && availableSources && availableSources.length > 0 && (
                <Accordion title="Fontes" icon={<DocumentTextIcon className="h-5 w-5" />} isOpen={openAccordions.includes('sources')} onToggle={() => toggleAccordion('sources')} summary={sourcesSummary}>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Exibir notícias apenas das fontes selecionadas:</p>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => onCriteriaChange(prev => ({...prev, sources: availableSources || [] }))}
                                className="flex-1 px-2 py-1 text-xs font-semibold rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                Selecionar Todas
                            </button>
                            <button 
                                type="button" 
                                onClick={() => onCriteriaChange(prev => ({...prev, sources: [] }))}
                                className="flex-1 px-2 py-1 text-xs font-semibold rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                Limpar Seleção
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {availableSources.map(source => (
                                <label key={source} className="flex items-center cursor-pointer text-sm p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                    <input
                                        type="checkbox"
                                        checked={(criteria.sources || []).includes(source)}
                                        onChange={() => {
                                            onCriteriaChange(prev => {
                                                const currentSources = prev.sources || [];
                                                const newSources = currentSources.includes(source)
                                                    ? currentSources.filter(item => item !== source)
                                                    : [...currentSources, source];
                                                return { ...prev, sources: newSources };
                                            });
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-900 dark:ring-offset-gray-900"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300" title={source}>{source}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </Accordion>
            )}
        </div>
    );
});