/*
 * Copyright 2025 Daniel Nery Frangilo Paiva
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ProcessedJob, ProcessedPredictedJob, SearchCriteria, PredictedCriteria } from '../types';
import { supabase } from '../utils/supabase';
// Import normalizeText from its dedicated module.
import { normalizeText } from '../utils/text';
import { ESTADOS_POR_REGIAO, VIZINHANCAS_ESTADOS } from '../constants';
import { retryAsync } from '../utils/helpers';

const JOB_OPENINGS_LIST_COLUMNS = 'title, organization, location, link, effective_city, logo_path, deadline_formatted, deadline_date, type, normalized_effective_city, max_salary_numeric, min_salary_numeric, vacancies_numeric, education_levels, parsed_salary_text, parsed_vacancies_text, mentioned_states, parsed_roles';
const PREDICTED_ARTICLES_COLUMNS = 'id, publication_date, title, link, source, mentioned_states';

// Helper function for full-text search with prefix matching
const createTsQuery = (term: string): string => {
    if (!term) return '';
    const normalized = normalizeText(term);
    // Split into words, filter out empty ones, add prefix operator, and join with spaces
    // The 'websearch' type for textSearch will interpret spaces as AND operators.
    return normalized
      .split(/\s+/)
      .filter(part => part.length > 0)
      .map(part => `${part}:*`)
      .join(' ');
};

const jobMapper = (item: any): ProcessedJob => ({
    titulo: item.title,
    orgao: item.organization,
    localidade: item.location,
    salario: item.parsed_salary_text || '', // Not used in UI, providing fallback
    escolaridade: (item.education_levels || []).join(' / '), // Not used in UI, providing fallback
    link: item.link,
    cidadeEfetiva: item.effective_city,
    logoPath: item.logo_path || undefined,
    prazoInscricaoFormatado: item.deadline_formatted,
    prazoInscricaoData: item.deadline_date,
    type: item.type,
    normalizedCidadeEfetiva: item.normalized_effective_city || '',
    maxSalaryNum: Number(item.max_salary_numeric) || 0,
    minSalaryNum: Number(item.min_salary_numeric) || 0,
    vacanciesNum: Number(item.vacancies_numeric) || 0,
    educationLevels: item.education_levels || [],
    parsedSalary: item.parsed_salary_text,
    parsedVacancies: item.parsed_vacancies_text,
    parsedRoles: item.parsed_roles || [],
    mentionedStates: item.mentioned_states || [],
});

const predictedJobMapper = (item: any): ProcessedPredictedJob => {
    // A data agora vem no formato YYYY-MM-DD
    const [year, month, day] = item.publication_date.split('-').map(Number);
    return {
        // Formata a data de volta para DD/MM/YYYY para exibição na UI
        date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        title: item.title,
        link: item.link,
        source: item.source,
        // Cria o objeto Date para compatibilidade, embora a ordenação principal seja no DB
        dateObject: new Date(year, month - 1, day),
        mentionedStates: item.mentioned_states || [],
    };
};

function buildBaseJobQuery(selectString: string, criteria: SearchCriteria, quickSearchTerm: string, signal?: AbortSignal) {
    let query = supabase.from('job_openings').select(selectString, { count: 'exact' });
    if (signal) {
        query = query.abortSignal(signal);
    }
    
    // Filtro por termo rápido (não salvo)
    if (quickSearchTerm) {
        const tsQuery = createTsQuery(quickSearchTerm);
        if (tsQuery) {
            query = query.textSearch('searchable_text', tsQuery, { config: 'portuguese', type: 'websearch' });
        }
    }

    // Filtro por palavra-chave (salvo nos critérios)
    if (criteria.palavraChave) {
        const tsQuery = createTsQuery(criteria.palavraChave);
        if (tsQuery) {
            query = query.textSearch('searchable_text', tsQuery, { config: 'portuguese', type: 'websearch' });
        }
    }

    if (criteria.cargo) {
        query = query.ilike('education_level_text', `%${normalizeText(criteria.cargo)}%`);
    }

    if (criteria.escolaridade && criteria.escolaridade.length > 0) {
        // Use .or() with 'cs' (contains) for jsonb array filtering.
        const orFilter = criteria.escolaridade.map(level => `education_levels.cs.["${level}"]`).join(',');
        query = query.or(orFilter);
    }
    
    if (criteria.salarioMinimo) {
        query = query.gte('max_salary_numeric', criteria.salarioMinimo);
    }

    if (criteria.vagasMinimas) {
        query = query.gte('vacancies_numeric', criteria.vagasMinimas);
    }
    
    const isDistanceSearch = criteria.distanciaRaio && criteria.cidadeFiltro && criteria.estado.length === 2;

    if (criteria.estado && criteria.estado !== 'brasil') {
        if (criteria.estado === 'nacional') {
            query = query.eq('location', 'Nacional');
        } else if (criteria.estado.startsWith('regiao-')) {
            const regionKeyRaw = criteria.estado.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            if (regionKey) {
                const regionStates = ESTADOS_POR_REGIAO[regionKey as keyof typeof ESTADOS_POR_REGIAO].map(s => s.sigla);
                // Use .or() with 'cs' (contains) for jsonb array filtering.
                const orFilter = regionStates.map(state => `mentioned_states.cs.["${state}"]`).join(',');
                query = query.or(orFilter);
            }
        } else {
            const targetStates = [criteria.estado.toUpperCase()];
            if (criteria.incluirVizinhos && VIZINHANCAS_ESTADOS[criteria.estado.toUpperCase()]) {
                targetStates.push(...VIZINHANCAS_ESTADOS[criteria.estado.toUpperCase()]);
            }
            // Use .or() with 'cs' (contains) for jsonb array filtering.
            const orFilter = targetStates.map(state => `mentioned_states.cs.["${state}"]`).join(',');
            query = query.or(orFilter);
        }
    }
    
    if (criteria.cidadeFiltro && criteria.estado.length === 2 && !isDistanceSearch) {
        query = query.eq('normalized_effective_city', normalizeText(criteria.cidadeFiltro));
    }
    return query;
}

export async function fetchJobs(criteria: SearchCriteria, page: number, pageSize: number, type: 'concurso' | 'processo_seletivo' | 'all', quickSearchTerm: string, signal?: AbortSignal) {
    const isDistanceSearch = criteria.distanciaRaio && criteria.cidadeFiltro && criteria.estado.length === 2;
    let query = buildBaseJobQuery(JOB_OPENINGS_LIST_COLUMNS, criteria, quickSearchTerm, signal);
    
    if (type !== 'all') {
        query = query.eq('type', type);
    }

    // Do not sort on the DB for distance search, as it will be sorted client-side later
    if (!isDistanceSearch) {
        const { sort } = criteria;
        if (sort.startsWith('alpha')) query = query.order('organization', { ascending: sort === 'alpha-asc' });
        else if (sort.startsWith('salary')) query = query.order('max_salary_numeric', { ascending: sort === 'salary-asc', nullsFirst: false });
        else if (sort.startsWith('vacancies')) query = query.order('vacancies_numeric', { ascending: sort === 'vacancies-asc', nullsFirst: false });
        else if (sort.startsWith('deadline')) query = query.order('deadline_date', { ascending: sort === 'deadline-asc', nullsFirst: false });
    }

    try {
        // Special handling for distance search to fetch a limited number of results for client-side filtering.
        if (isDistanceSearch) {
            const DISTANCE_SEARCH_FETCH_LIMIT = 2000; // Limit to prevent timeouts on very broad searches
            let allData: any[] = [];
            let offset = 0;
            const limit = 1000; // Supabase client limit
            let hasMore = true;

            while (hasMore && allData.length < DISTANCE_SEARCH_FETCH_LIMIT) {
                if (signal?.aborted) throw new Error("The operation was aborted.");

                // Add retry logic to each chunk fetch
                const { data, error, count } = await retryAsync(async () => {
                    const result = await query.range(offset, offset + limit - 1);
                    if (result.error) throw result.error;
                    return result;
                }, 3, 200);

                if (error) throw error;
                
                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    offset += data.length;
                }
                
                // If count is available and we've fetched all, or if last fetch was short, stop.
                if (!data || data.length < limit || (count !== null && offset >= count)) {
                    hasMore = false;
                }
            }
            
            if (allData.length >= DISTANCE_SEARCH_FETCH_LIMIT) {
                console.warn(`Distance search fetch limit of ${DISTANCE_SEARCH_FETCH_LIMIT} reached. Results may be incomplete.`);
            }

            const jobs = allData.map(jobMapper);
            // The count is the number of jobs that will be filtered on the client.
            return { jobs, count: jobs.length };
        }

        // Standard paginated search for regular queries.
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count } = await retryAsync(async () => {
            const { data, error, count } = await query;
            if (error) throw error;
            return { data, count };
        }, 3, 500);

        const jobs = (data || []).map(jobMapper);
        return { jobs, count: count ?? 0 };
    } catch (error: any) {
        const isAbortError = error.name === 'AbortError' || (error.message && error.message.includes('The operation was aborted'));
        if (isAbortError) {
            const abortErr = new Error("The operation was aborted.");
            abortErr.name = "AbortError";
            throw abortErr;
        }

        const lowerCaseMessage = (error.message || '').toLowerCase();
        if (lowerCaseMessage.includes('networkerror') || lowerCaseMessage.includes('failed to fetch')) {
            window.dispatchEvent(new CustomEvent('networkError'));
        }

        console.error(`Error fetching jobs (type: ${type}) after retries:`, error);
        
        let userMessage = 'Falha ao buscar vagas. Verifique sua conexão e tente novamente.';
        if (error.message && error.message.toLowerCase().includes('statement timeout')) {
            userMessage = 'A busca demorou demais para responder. Tente usar filtros mais específicos para refinar sua pesquisa.';
        }

        throw new Error(userMessage);
    }
}

export async function fetchJobsSummary(criteria: SearchCriteria, quickSearchTerm: string, signal?: AbortSignal) {
    // Only select columns needed for summary to optimize payload
    let query = buildBaseJobQuery('vacancies_numeric, max_salary_numeric', criteria, quickSearchTerm, signal);
    
    try {
        // Fetch all results in chunks to avoid timeout or memory issues on large queries.
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000; // Supabase client limit
        let hasMore = true;
        let totalCount: number | null = null;

        while (hasMore) {
            if (signal?.aborted) throw new Error("The operation was aborted.");

            const { data, error, count } = await retryAsync(async () => {
                const result = await query.range(offset, offset + limit - 1);
                if (result.error) throw result.error;
                return result;
            }, 3, 200);
            
            if (error) throw error;
            
            if (offset === 0) {
                totalCount = count;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                offset += data.length;
            }

            if (!data || data.length < limit || (totalCount !== null && offset >= totalCount)) {
                hasMore = false;
            }
        }

        const summary = allData.reduce(
            (acc, job) => {
                acc.totalVacancies += Number(job.vacancies_numeric) || 0;
                if ((Number(job.max_salary_numeric) || 0) > acc.highestSalary) {
                    acc.highestSalary = Number(job.max_salary_numeric) || 0;
                }
                return acc;
            },
            { totalVacancies: 0, highestSalary: 0 }
        );

        return { totalOpportunities: totalCount ?? 0, ...summary };
    } catch (error: any) {
        const isAbortError = error.name === 'AbortError' || (error.message && error.message.includes('The operation was aborted'));
        if (isAbortError) {
            const abortErr = new Error("The operation was aborted.");
            abortErr.name = "AbortError";
            throw abortErr;
        }

        const lowerCaseMessage = (error.message || '').toLowerCase();
        if (lowerCaseMessage.includes('networkerror') || lowerCaseMessage.includes('failed to fetch')) {
            window.dispatchEvent(new CustomEvent('networkError'));
        }

        console.error('Error fetching jobs summary after retries:', error);
        
        let userMessage = 'Falha ao buscar o resumo das vagas. Verifique sua conexão.';
        if (error.message && error.message.toLowerCase().includes('statement timeout')) {
            userMessage = 'O cálculo do resumo demorou demais. Tente usar filtros mais específicos.';
        }
        
        throw new Error(userMessage);
    }
}

export async function fetchArticles(table: 'predicted_openings' | 'news_articles', criteria: PredictedCriteria, page: number, pageSize: number, quickSearchTerm: string, signal?: AbortSignal) {
    let query = supabase.from(table).select(PREDICTED_ARTICLES_COLUMNS, { count: 'exact' });
    if (signal) {
        query = query.abortSignal(signal);
    }

    const { searchTerm, location, month, year, sources, sort } = criteria;
    
    if (quickSearchTerm) {
        const tsQuery = createTsQuery(quickSearchTerm);
        if (tsQuery) {
            query = query.textSearch('normalized_title', tsQuery, { config: 'portuguese', type: 'websearch' });
        }
    }

    if (searchTerm) {
        const tsQuery = createTsQuery(searchTerm);
        if (tsQuery) {
            query = query.textSearch('normalized_title', tsQuery, { config: 'portuguese', type: 'websearch' });
        }
    }

    if (location !== 'brasil') {
        if (location.startsWith('regiao-')) {
            const regionKeyRaw = location.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            if (regionKey) {
                const regionStates = ESTADOS_POR_REGIAO[regionKey as keyof typeof ESTADOS_POR_REGIAO].map(s => s.sigla);
                // Use .or() with 'cs' (contains) for jsonb array filtering
                const orFilter = regionStates.map(state => `mentioned_states.cs.["${state}"]`).join(',');
                query = query.or(orFilter);
            }
        } else {
            // Use .or() with a 'cs' filter string to correctly query the jsonb array.
            const orFilter = `mentioned_states.cs.["${location.toUpperCase()}"]`;
            query = query.or(orFilter);
        }
    }
    
    // Filtro de data por string matching (YYYY-MM-DD)
    if (year !== 'todos') {
        const datePattern = `${year}-${month !== 'todos' ? String(month).padStart(2, '0') : '%'}-%`;
        query = query.like('publication_date', datePattern);
    } else if (month !== 'todos') {
        const datePattern = `%-${String(month).padStart(2, '0')}-%`;
        query = query.like('publication_date', datePattern);
    }


    if (sources && sources.length > 0) {
        query = query.in('source', sources);
    }
    
    // A ordenação agora é feita no banco de dados na coluna de texto `publication_date`,
    // que está no formato YYYY-MM-DD para garantir a ordenação correta.
    query = query.order('publication_date', { ascending: sort === 'date-asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    try {
        const { data, count } = await retryAsync(async () => {
            const { data, error, count } = await query;
            if (error) throw error;
            return { data, count };
        }, 3, 500);

        const items = (data || []).map(predictedJobMapper);
        
        return { items, count: count ?? 0 };
    } catch (error: any) {
        const isAbortError = error.name === 'AbortError' || (error.message && error.message.includes('The operation was aborted'));
        if (isAbortError) {
            const abortErr = new Error("The operation was aborted.");
            abortErr.name = "AbortError";
            throw abortErr;
        }

        const lowerCaseMessage = (error.message || '').toLowerCase();
        if (lowerCaseMessage.includes('networkerror') || lowerCaseMessage.includes('failed to fetch')) {
            window.dispatchEvent(new CustomEvent('networkError'));
        }

        console.error(`Error fetching articles from ${table} after retries:`, error);
        
        let userMessage = `Falha ao buscar os artigos. Verifique sua conexão.`;
        if (error.message && error.message.toLowerCase().includes('statement timeout')) {
            userMessage = 'A busca demorou demais para responder. Tente usar filtros mais específicos para refinar sua pesquisa.';
        }

        throw new Error(userMessage);
    }
}

export async function fetchSourcesForTable(table: 'predicted_openings' | 'news_articles'): Promise<string[]> {
    const allSources = new Set<string>();
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase.from(table).select('source').range(from, to);

        if (error) {
            const lowerCaseMessage = (error.message || '').toLowerCase();
            if (lowerCaseMessage.includes('networkerror') || lowerCaseMessage.includes('failed to fetch')) {
                window.dispatchEvent(new CustomEvent('networkError'));
            }
            console.error(`Error fetching sources from ${table}:`, error);
            return [];
        }

        if (data) {
            for (const item of data) {
                if (item.source) {
                    allSources.add(item.source);
                }
            }
        }

        if (!data || data.length < pageSize) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return Array.from(allSources).sort();
}