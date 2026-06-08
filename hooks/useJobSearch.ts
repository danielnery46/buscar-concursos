import { useState, useEffect, useMemo } from 'react';
import { City, ProcessedJob, SearchCriteria, SummaryData, JobInterestMap, JobInterestFilter } from '../types';
import { useDebounce } from './useDebounce';
// FIX: Import geo and text utilities from their dedicated modules and sortJobs from helpers.
import { groupAndSortByInterest } from '../utils/helpers';
import { processJobData, calculateDrivingDistances, haversineDistance } from '../utils/geo';
import { normalizeText } from '../utils/text';
import { systemDefaultValues } from '../constants';
import { fetchJobs, fetchJobsSummary, fetchJobsGroupedByInterest, type JobLinkFilter } from '../services/scrapingService';

export const calculateActiveFilters = (criteria: SearchCriteria): number => {
    let count = 0;
    const isStateSelected = criteria.estado.length === 2;
    if (criteria.estado !== 'brasil') count++;
    if (criteria.cidadeFiltro && isStateSelected) count++;
    if (criteria.palavraChave) count++;
    if (criteria.cargo) count++;
    if (criteria.escolaridade.length > 0) count++;
    if (criteria.salarioMinimo) count++;
    if (criteria.vagasMinimas) count++;
    if (criteria.incluirVizinhos && isStateSelected) count++;
    if (criteria.distanciaRaio && criteria.cidadeFiltro && isStateSelected) count++;
    if (criteria.sort !== systemDefaultValues.sort) count++;
    return count;
};

export const useJobSearch = (
    cityDataCache: Record<string, City[]>,
    defaultSearch: SearchCriteria | null,
    isUserDataLoaded: boolean,
    isCityDataLoading: boolean,
    itemsPerPage: number,
    isActive: boolean,
    quickSearchTerm: string,
    /** Mapa `link -> status de interesse` do usuário (ver `useJobInterests`). */
    interestMap: JobInterestMap = {},
    /** `true` quando as marcações de interesse já foram carregadas e podem ser usadas com segurança. */
    areInterestsLoaded: boolean = true,
    /** Filtro de interesse selecionado pelo usuário: todos / só interessantes / só sem interesse / só não classificadas. */
    interestFilter: JobInterestFilter = 'all',
) => {
    const [criteria, setCriteria] = useState<SearchCriteria>(systemDefaultValues);
    const debouncedCriteria = useDebounce(criteria, 500);
    // Always start in loading state so the UI shows a spinner from the very
    // first render instead of briefly flashing an empty state. The fetch
    // effect sets this to false when the first query completes.
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [concursosPage, setConcursosPage] = useState(1);
    const [processosPage, setProcessosPage] = useState(1);

    const [concursos, setConcursos] = useState<ProcessedJob[]>([]);
    const [totalConcursos, setTotalConcursos] = useState(0);
    const [processosSeletivos, setProcessosSeletivos] = useState<ProcessedJob[]>([]);
    const [totalProcessos, setTotalProcessos] = useState(0);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isReadyToFetch, setIsReadyToFetch] = useState(false);

    // Deriva, do mapa de marcações, as listas (pequenas e estáveis) de links "com
    // interesse" e "sem interesse" — usadas tanto para o filtro simples (`.in`) quanto
    // para o agrupamento global por interesse (`fetchJobsGroupedByInterest`).
    const { interestedLinks, notInterestedLinks } = useMemo(() => {
        const interested: string[] = [];
        const notInterested: string[] = [];
        for (const [link, status] of Object.entries(interestMap)) {
            if (status === 'interested') interested.push(link);
            else if (status === 'not_interested') notInterested.push(link);
        }
        interested.sort();
        notInterested.sort();
        return { interestedLinks: interested, notInterestedLinks: notInterested };
    }, [interestMap]);

    const hasAnyInterestMarks = interestedLinks.length > 0 || notInterestedLinks.length > 0;

    // Quando o usuário filtra explicitamente por "Com interesse", "Sem interesse" ou
    // "Sem classificação", basta restringir/excluir a busca por esses links (`.in`/`.not.in`)
    // — não há o que agrupar, pois todos os resultados já compartilham o mesmo status.
    const interestQueryFilter = useMemo<JobLinkFilter | null>(() => {
        if (interestFilter === 'interested') return { mode: 'in', links: interestedLinks };
        if (interestFilter === 'not_interested') return { mode: 'in', links: notInterestedLinks };
        if (interestFilter === 'unmarked') return { mode: 'not_in', links: [...interestedLinks, ...notInterestedLinks] };
        return null;
    }, [interestFilter, interestedLinks, notInterestedLinks]);

    // Quando não há filtro explícito ("Todos") mas o usuário já marcou pelo menos uma
    // vaga, aplicamos o agrupamento GLOBAL por interesse — respeitando a ordenação
    // escolhida em cada grupo (interessantes no topo, sem interesse no final).
    const useInterestGrouping = areInterestsLoaded && interestFilter === 'all' && hasAnyInterestMarks;

    // This effect resets the page numbers whenever the main search filters change,
    // ensuring new searches always start from the first page.
    useEffect(() => {
        setConcursosPage(1);
        setProcessosPage(1);
    }, [debouncedCriteria, quickSearchTerm, interestFilter, interestedLinks, notInterestedLinks]);

    useEffect(() => {
        if (isUserDataLoaded) {
            const initialCriteria = { ...systemDefaultValues, ...(defaultSearch || {}) };
            setCriteria(initialCriteria);
            
            // Set a timer to align with the debounce period.
            // This ensures the first fetch only happens after the initial criteria are debounced.
            const timer = setTimeout(() => {
                setIsReadyToFetch(true);
            }, 500); // Must match useDebounce delay

            return () => clearTimeout(timer);
        }
    }, [defaultSearch, isUserDataLoaded]);
    
    useEffect(() => {
        // Guarda de segurança para não executar a busca até que tudo esteja pronto
        // (incluindo as marcações de interesse, para evitar buscar sem filtro/agrupamento
        // e logo em seguida refazer a busca já com eles aplicados).
        if (!isActive || !isReadyToFetch || isCityDataLoading || !areInterestsLoaded) {
            return;
        }

        const controller = new AbortController();
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const { distanciaRaio, cidadeFiltro, estado, sort } = debouncedCriteria;
                const isDistanceSearch = !!(distanciaRaio && cidadeFiltro && estado.length === 2);

                if (isDistanceSearch) {
                    const selectedCityData = cityDataCache[estado.toUpperCase()]?.find(c => c.name === cidadeFiltro);
                    if (!selectedCityData) {
                        setConcursos([]); setTotalConcursos(0);
                        setProcessosSeletivos([]); setTotalProcessos(0);
                        setSummaryData({ totalOpportunities: 0, totalVacancies: 0, highestSalary: 0 });
                        return;
                    };
                    
                    const { jobs: allStateJobs } = await fetchJobs(debouncedCriteria, 1, 1, 'all', quickSearchTerm, controller.signal, interestQueryFilter);

                    const allCitiesMap = new Map<string, City>();
                    Object.entries(cityDataCache).forEach(([st, cities]) => {
                        if (Array.isArray(cities)) cities.forEach(city => {
                            allCitiesMap.set(`${normalizeText(city.name)}-${st.toLowerCase()}`, city);
                        });
                    });

                    const jobsWithGeo = allStateJobs.map(job => processJobData(job, allCitiesMap));
                    
                    // ... (Etapas 1, 2, 3 de geolocalização) ...
                    const haversineRadiusMultiplier = 1.5; 
                    const jobsWithHaversineDistance = jobsWithGeo.map(job => {
                        if (job.lat && job.lon) {
                            return {
                                ...job,
                                distance: haversineDistance(selectedCityData.lat, selectedCityData.lon, job.lat, job.lon)
                            };
                        }
                        return job;
                    });
                    
                    const candidateJobs = jobsWithHaversineDistance.filter(job => 
                        job.distance !== undefined && job.distance <= (distanciaRaio as number) * haversineRadiusMultiplier
                    );

                    const jobsWithDrivingDistance = await calculateDrivingDistances(
                        { lat: selectedCityData.lat, lon: selectedCityData.lon },
                        candidateJobs
                    );
                    
                    const jobsInRadius = jobsWithDrivingDistance.filter(job => job.distance !== undefined && job.distance <= (distanciaRaio as number));

                    // Já temos o conjunto completo em memória aqui, então o agrupamento por
                    // interesse pode ser feito de forma perfeitamente global (não apenas por
                    // página): "com interesse" no topo, depois não avaliadas, depois "sem
                    // interesse" — cada grupo já ordenado conforme o critério escolhido.
                    const sortedJobs = groupAndSortByInterest(jobsInRadius, useInterestGrouping ? interestMap : {}, sort);

                    const finalConcursos = sortedJobs.filter(j => j.type === 'concurso');
                    const finalProcessos = sortedJobs.filter(j => j.type === 'processo_seletivo');

                    setConcursos(finalConcursos.slice((concursosPage - 1) * itemsPerPage, concursosPage * itemsPerPage));
                    setTotalConcursos(finalConcursos.length);
                    setProcessosSeletivos(finalProcessos.slice((processosPage - 1) * itemsPerPage, processosPage * itemsPerPage));
                    setTotalProcessos(finalProcessos.length);
                    
                    const summary = sortedJobs.reduce((acc, job) => {
                        acc.totalVacancies += job.vacanciesNum || 0;
                        if(job.maxSalaryNum > acc.highestSalary) acc.highestSalary = job.maxSalaryNum;
                        return acc;
                    }, { totalVacancies: 0, highestSalary: 0 });
                    setSummaryData({ totalOpportunities: sortedJobs.length, ...summary });

                } else {
                    // Decoupled fetching...
                    const summaryPromise = fetchJobsSummary(debouncedCriteria, quickSearchTerm, controller.signal, interestQueryFilter)
                        .then(summary => setSummaryData(summary))
                        .catch(summaryError => {
                            if (summaryError.name !== 'AbortError') {
                                console.error("Error fetching summary data:", summaryError);
                                setSummaryData(null);
                            }
                        });

                    // Quando não há filtro explícito mas existem marcações, usamos a busca
                    // com agrupamento global (DB-side) — que já retorna cada página com
                    // "com interesse" no topo, depois não avaliadas, depois "sem interesse",
                    // respeitando a ordenação escolhida em cada grupo. Caso contrário, a
                    // busca paginada padrão (com filtro simples `.in`, se houver) é suficiente.
                    const jobsPromise = (useInterestGrouping
                        ? Promise.all([
                            fetchJobsGroupedByInterest(debouncedCriteria, concursosPage, itemsPerPage, 'concurso', quickSearchTerm, interestedLinks, notInterestedLinks, controller.signal),
                            fetchJobsGroupedByInterest(debouncedCriteria, processosPage, itemsPerPage, 'processo_seletivo', quickSearchTerm, interestedLinks, notInterestedLinks, controller.signal),
                        ])
                        : Promise.all([
                            fetchJobs(debouncedCriteria, concursosPage, itemsPerPage, 'concurso', quickSearchTerm, controller.signal, interestQueryFilter),
                            fetchJobs(debouncedCriteria, processosPage, itemsPerPage, 'processo_seletivo', quickSearchTerm, controller.signal, interestQueryFilter),
                        ])
                    ).then(([concursosResult, processosResult]) => {
                        setConcursos(concursosResult.jobs);
                        setTotalConcursos(concursosResult.count);
                        setProcessosSeletivos(processosResult.jobs);
                        setTotalProcessos(processosResult.count);
                    }).catch(jobError => {
                        if (jobError.name !== 'AbortError') {
                            throw jobError;
                        }
                    });

                    await Promise.all([summaryPromise, jobsPromise]);
                }

            } catch (err: any) {
                if (!controller.signal.aborted) {
                    setError(err.message || "Ocorreu um erro desconhecido ao buscar as vagas.");
                    console.error("Error fetching job data:", err);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
        return () => { controller.abort(); };
    }, [debouncedCriteria, quickSearchTerm, concursosPage, processosPage, isActive, isCityDataLoading, itemsPerPage, isReadyToFetch, areInterestsLoaded, interestFilter, interestedLinks, notInterestedLinks, interestQueryFilter, useInterestGrouping, interestMap]);

    return {
        criteria: criteria ?? systemDefaultValues,
        setCriteria,
        debouncedCriteria: debouncedCriteria ?? systemDefaultValues,
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
    };
};