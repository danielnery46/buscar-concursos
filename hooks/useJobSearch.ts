import { useState, useEffect } from 'react';
import { City, ProcessedJob, SearchCriteria, SummaryData } from '../types';
import { useDebounce } from './useDebounce';
// FIX: Import geo and text utilities from their dedicated modules and sortJobs from helpers.
import { sortJobs } from '../utils/helpers';
import { processJobData, haversineDistance } from '../utils/geo';
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
    concursosPage: number,
    processosPage: number,
    itemsPerPage: number,
    isActive: boolean
) => {
    const [criteria, setCriteria] = useState<SearchCriteria>(systemDefaultValues);
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(isActive);
    const [error, setError] = useState<string | null>(null);

    const [concursos, setConcursos] = useState<ProcessedJob[]>([]);
    const [totalConcursos, setTotalConcursos] = useState(0);
    const [processosSeletivos, setProcessosSeletivos] = useState<ProcessedJob[]>([]);
    const [totalProcessos, setTotalProcessos] = useState(0);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Efeito para inicializar os critérios apenas uma vez, quando os dados do usuário estiverem prontos.
    useEffect(() => {
        if (isUserDataLoaded) {
            setCriteria({ ...systemDefaultValues, ...(defaultSearch || {}) });
            setIsInitialized(true);
        }
    }, [defaultSearch, isUserDataLoaded]);
    
    useEffect(() => {
        // Guarda de segurança para não executar a busca até que tudo esteja pronto.
        if (!isActive || !isUserDataLoaded || isCityDataLoading || !isInitialized) {
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
                        setIsLoading(false);
                        return;
                    };
                    
                    // fetchJobs now handles fetching all results internally for distance searches.
                    const { jobs: allStateJobs } = await fetchJobs(debouncedCriteria, 1, 1, 'all', controller.signal);

                    const allCitiesMap = new Map<string, City>();
                    Object.entries(cityDataCache).forEach(([st, cities]) => {
                        if (Array.isArray(cities)) cities.forEach(city => {
                            allCitiesMap.set(`${normalizeText(city.name)}-${st.toLowerCase()}`, city);
                        });
                    });

                    const jobsWithGeo = allStateJobs.map(job => processJobData(job, allCitiesMap));
                    const jobsInRadius = jobsWithGeo.map(job => {
                        const distance = (job.lat && job.lon) ? haversineDistance(selectedCityData.lat, selectedCityData.lon, job.lat, job.lon) : undefined;
                        return { ...job, distance };
                    }).filter(job => job.distance !== undefined && job.distance <= distanciaRaio);

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
                    
                } else {
                    // Decoupled fetching: Summary and job lists fetch in parallel.
                    // A failure in summary won't block the job lists from rendering.
                    const summaryPromise = fetchJobsSummary(debouncedCriteria, controller.signal)
                        .then(summary => setSummaryData(summary))
                        .catch(summaryError => {
                            if (summaryError.name !== 'AbortError') {
                                console.error("Error fetching summary data:", summaryError);
                                setSummaryData(null); // Clear summary on error but don't set a page-level error.
                            }
                        });

                    const jobsPromise = Promise.all([
                        fetchJobs(debouncedCriteria, concursosPage, itemsPerPage, 'concurso', controller.signal),
                        fetchJobs(debouncedCriteria, processosPage, itemsPerPage, 'processo_seletivo', controller.signal),
                    ]).then(([concursosResult, processosResult]) => {
                        setConcursos(concursosResult.jobs);
                        setTotalConcursos(concursosResult.count);
                        setProcessosSeletivos(processosResult.jobs);
                        setTotalProcessos(processosResult.count);
                    }).catch(jobError => {
                        // Only set the main page error if fetching the job lists fails.
                        if (jobError.name !== 'AbortError') {
                            throw jobError;
                        }
                    });

                    await Promise.all([summaryPromise, jobsPromise]);
                }

            } catch (err: any) {
                if (err.name !== 'AbortError') {
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
    }, [debouncedCriteria, concursosPage, processosPage, isActive]);

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
    };
};