import { useState, useEffect, useMemo } from 'react';
import { City, ProcessedJob, SearchCriteria, SummaryData, OpenJobsSortOption } from '../types';
import { useDebounce } from './useDebounce';
import { normalizeText } from '../utils/text';
import { haversineDistance, processJobData } from '../utils/geo';
import { systemDefaultValues, VIZINHANCAS_ESTADOS, ESTADOS_POR_REGIAO } from '../constants';


export const calculateActiveFilters = (criteria: SearchCriteria): number => {
    let count = 0;
    const isStateSelected = criteria.estado.length === 2;
    if (criteria.estado !== 'brasil') count++;
    if (criteria.cidadeFiltro && isStateSelected) count++;
    if (criteria.palavraChave) count++;
    if (criteria.escolaridade.length > 0) count++;
    if (criteria.salarioMinimo) count++;
    if (criteria.vagasMinimas) count++;
    if (criteria.incluirVizinhos && isStateSelected) count++;
    if (criteria.distanciaRaio && criteria.cidadeFiltro && isStateSelected) count++;
    return count;
};

export const sortJobs = (jobs: ProcessedJob[], sortOption: OpenJobsSortOption): ProcessedJob[] => {
    const sorted = [...jobs];
    switch (sortOption) {
        case 'alpha-asc':
            return sorted.sort((a, b) => a.orgao.localeCompare(b.orgao, 'pt-BR', { sensitivity: 'base' }));
        case 'alpha-desc':
            return sorted.sort((a, b) => b.orgao.localeCompare(a.orgao, 'pt-BR', { sensitivity: 'base' }));
        case 'salary-desc':
            return sorted.sort((a, b) => b.maxSalaryNum - a.maxSalaryNum);
        case 'salary-asc':
            return sorted.sort((a, b) => a.maxSalaryNum - b.maxSalaryNum);
        case 'vacancies-desc':
            return sorted.sort((a, b) => b.vacanciesNum - a.vacanciesNum);
        case 'vacancies-asc':
            return sorted.sort((a, b) => a.vacanciesNum - b.vacanciesNum);
        case 'deadline-asc':
            return sorted.sort((a, b) => {
                const dateA = a.prazoInscricaoData;
                const dateB = b.prazoInscricaoData;
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return new Date(dateA).getTime() - new Date(dateB).getTime();
            });
        case 'deadline-desc':
                return sorted.sort((a, b) => {
                const dateA = a.prazoInscricaoData;
                const dateB = b.prazoInscricaoData;
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                // FIX: Corrected a typo where the entire job object `a` was passed to `new Date()` instead of the date string `dateA`.
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        default:
            return sorted;
    }
};

export const useJobSearch = (
    jobs: ProcessedJob[],
    cityDataCache: Record<string, City[]>,
    defaultSearch: SearchCriteria | null,
    isUserDataLoaded: boolean
) => {
    const [criteria, setCriteria] = useState<SearchCriteria>({ ...systemDefaultValues, ...(defaultSearch || {}) });
    const debouncedCriteria = useDebounce(criteria, 500);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredJobs, setFilteredJobs] = useState<ProcessedJob[]>([]);

    useEffect(() => {
        if (isUserDataLoaded) {
            setCriteria({ ...systemDefaultValues, ...(defaultSearch || {}) });
        }
    }, [defaultSearch, isUserDataLoaded]);

    useEffect(() => {
        if (!jobs.length) {
            setFilteredJobs([]);
            return;
        }

        setIsLoading(true);

        const processingTimer = setTimeout(() => {
            const allCitiesMap = new Map<string, City>();
            Object.entries(cityDataCache).forEach(([state, cities]) => {
                if (Array.isArray(cities)) {
                    cities.forEach(city => {
                        const key = `${city.normalizedName}-${state.toLowerCase()}`;
                        if (!allCitiesMap.has(key)) allCitiesMap.set(key, city);
                    });
                }
            });

            const jobsWithGeo = jobs.map(job => processJobData(job, allCitiesMap));
            
            const {
                estado, cidadeFiltro, escolaridade, salarioMinimo, vagasMinimas,
                palavraChave, incluirVizinhos, distanciaRaio
            } = debouncedCriteria;

            const normalizedKeyword = normalizeText(palavraChave);
            const selectedCityData = (cidadeFiltro && estado.length === 2 && cityDataCache[estado.toUpperCase()])
                ? cityDataCache[estado.toUpperCase()].find(c => c.name === cidadeFiltro)
                : null;

            const filteredResult = jobsWithGeo.filter(job => {
                // Generate searchable text on the fly
                const searchableText = normalizeText(`${job.orgao} ${job.titulo} ${job.localidade} ${job.escolaridade}`);

                // Estado/Região
                if (estado !== 'brasil') {
                    if (estado === 'nacional') {
                        if (job.localidade.toUpperCase() !== 'NACIONAL') return false;
                    } else if (estado.startsWith('regiao-')) {
                        const regionKeyRaw = estado.replace('regiao-', '');
                        const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
                        if(regionKey) {
                            const regionStates = ESTADOS_POR_REGIAO[regionKey].map(s => s.sigla);
                            if (!job.mentionedStates?.some(s => regionStates.includes(s))) return false;
                        }
                    } else { // State is selected
                        const targetStates = new Set([estado.toUpperCase()]);
                        if (incluirVizinhos && VIZINHANCAS_ESTADOS[estado.toUpperCase()]) {
                            VIZINHANCAS_ESTADOS[estado.toUpperCase()].forEach(s => targetStates.add(s));
                        }
                        if (!job.mentionedStates?.some(s => targetStates.has(s))) return false;
                    }
                }

                // Cidade
                if (cidadeFiltro && estado.length === 2) {
                    const isRadiusSearch = distanciaRaio && selectedCityData;
                    
                    if (isRadiusSearch) {
                        if (job.lat && job.lon) {
                            const distance = haversineDistance(selectedCityData!.lat, selectedCityData!.lon, job.lat, job.lon);
                            job.distance = distance;
                            if (distance > distanciaRaio) {
                                return false;
                            }
                        } else {
                            if (normalizeText(job.cidadeEfetiva) === normalizeText(cidadeFiltro)) {
                                 job.distance = 0;
                            } else {
                                 return false;
                            }
                        }
                    } else {
                        job.distance = undefined;
                        if (normalizeText(job.cidadeEfetiva) !== normalizeText(cidadeFiltro)) {
                            return false;
                        }
                    }
                } else {
                    job.distance = undefined;
                }


                // Keyword
                if (normalizedKeyword && !searchableText.includes(normalizedKeyword)) return false;

                // Salario
                if (salarioMinimo && job.maxSalaryNum < salarioMinimo) return false;

                // Vagas
                if (vagasMinimas && job.vacanciesNum < vagasMinimas) return false;

                // Escolaridade
                if (escolaridade.length > 0 && !escolaridade.some(level => job.educationLevels.includes(level))) return false;

                return true;
            });
            
            setFilteredJobs(filteredResult);
            setIsLoading(false);
        }, 10);

        return () => {
            clearTimeout(processingTimer);
        };
    }, [debouncedCriteria, jobs, cityDataCache]);
    
    const { concursos, processosSeletivos, summaryData } = useMemo(() => {
        const concursos: ProcessedJob[] = [];
        const processosSeletivos: ProcessedJob[] = [];
        let totalVacancies = 0;
        let highestSalary = 0;

        filteredJobs.forEach(job => {
            if (job.type === 'concurso') {
                concursos.push(job);
            } else {
                processosSeletivos.push(job);
            }
            totalVacancies += job.vacanciesNum || 0;
            if (job.maxSalaryNum > highestSalary) {
                highestSalary = job.maxSalaryNum;
            }
        });

        const summaryData: SummaryData = {
            totalOpportunities: filteredJobs.length,
            totalVacancies,
            highestSalary
        };

        return { concursos, processosSeletivos, summaryData };
    }, [filteredJobs]);

    return {
        criteria,
        setCriteria,
        debouncedCriteria,
        concursos,
        processosSeletivos,
        summaryData,
        isLoading
    };
};