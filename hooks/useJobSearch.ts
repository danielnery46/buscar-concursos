import { useState, useEffect } from 'react';
import { City, ProcessedJob, SearchCriteria, SummaryData } from '../types';
import { useDebounce } from './useDebounce';
// FIX: Import geo and text utilities from their dedicated modules and sortJobs from helpers.
import { sortJobs } from '../utils/helpers';
import { processJobData, calculateDrivingDistances, haversineDistance } from '../utils/geo';
import { normalizeText } from '../utils/text';
import { systemDefaultValues } from '../constants';
import { fetchJobs, fetchJobsSummary } from '../services/scrapingService';

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
) => {
    const [criteria, setCriteria] = useState<SearchCriteria>(systemDefaultValues);
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(isActive);
    const [error, setError] = useState<string | null>(null);

    const [concursosPage, setConcursosPage] = useState(1);
    const [processosPage, setProcessosPage] = useState(1);

    const [concursos, setConcursos] = useState<ProcessedJob[]>([]);
    const [totalConcursos, setTotalConcursos] = useState(0);
    const [processosSeletivos, setProcessosSeletivos] = useState<ProcessedJob[]>([]);
    const [totalProcessos, setTotalProcessos] = useState(0);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isReadyToFetch, setIsReadyToFetch] = useState(false);

    // This effect resets the page numbers whenever the main search filters change,
    // ensuring new searches always start from the first page.
    useEffect(() => {
        setConcursosPage(1);
        setProcessosPage(1);
    }, [debouncedCriteria, quickSearchTerm]);

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
        // Guarda de segurança para não executar a busca até que tudo esteja pronto.
        if (!isActive || !isReadyToFetch || isCityDataLoading) {
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
                        setIsLoading(false); // <-- CORREÇÃO: Movido para cá
                        return;
                    };
                    
                    const { jobs: allStateJobs } = await fetchJobs(debouncedCriteria, 1, 1, 'all', quickSearchTerm, controller.signal);

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

                    const sortedJobs = sortJobs(jobsInRadius, sort);

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

                    setIsLoading(false); // <-- CORREÇÃO: Movido para o fim do 'try'
                    
                } else {
                    // Decoupled fetching...
                    const summaryPromise = fetchJobsSummary(debouncedCriteria, quickSearchTerm, controller.signal)
                        .then(summary => setSummaryData(summary))
                        .catch(summaryError => {
                            if (summaryError.name !== 'AbortError') {
                                console.error("Error fetching summary data:", summaryError);
                                setSummaryData(null);
                            }
                        });

                    const jobsPromise = Promise.all([
                        fetchJobs(debouncedCriteria, concursosPage, itemsPerPage, 'concurso', quickSearchTerm, controller.signal),
                        fetchJobs(debouncedCriteria, processosPage, itemsPerPage, 'processo_seletivo', quickSearchTerm, controller.signal),
                    ]).then(([concursosResult, processosResult]) => {
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
                    setIsLoading(false); // <-- CORREÇÃO: Movido para o fim do 'try'
                }

            } catch (err: any) {
                // A lógica do 'catch' está correta (como fizemos da última vez)
                if (!controller.signal.aborted) {
                    setError(err.message || "Ocorreu um erro desconhecido ao buscar as vagas.");
                    console.error("Error fetching job data:", err);
                    setIsLoading(false); // <-- CORREÇÃO: Adicionado aqui também
                }
            } 
            // CORREÇÃO: Bloco 'finally' removido para evitar a condição de corrida.
        };

        fetchData();
        return () => { controller.abort(); };
    }, [debouncedCriteria, quickSearchTerm, concursosPage, processosPage, isActive, isCityDataLoading, itemsPerPage, isReadyToFetch]);

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