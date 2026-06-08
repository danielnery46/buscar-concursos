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
import { ESTADOS_POR_REGIAO, VIZINHANCAS_ESTADOS, years } from '../constants';
import { retryAsync } from '../utils/helpers';
import { queryCache, buildCacheKey } from '../utils/queryCache';

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

/**
 * Filtro por `link` usado para restringir (`in`) ou excluir (`not_in`) um conjunto
 * limitado e conhecido de vagas — usado pelo sistema de marcação de interesse, cujas
 * listas de links (marcações do próprio usuário) são sempre pequenas e já carregadas
 * em memória, tornando esse filtro seguro e barato no nível do banco de dados.
 */
export type JobLinkFilter = { mode: 'in' | 'not_in'; links: string[] };

/**
 * Formata uma lista de strings no formato de lista do PostgREST `(\"a\",\"b\",...)`,
 * citando e escapando valores que contenham caracteres especiais (vírgula, parênteses,
 * aspas ou barra invertida) — necessário para o operador `not.in`, que (ao contrário de
 * `.in()`) recebe a lista já serializada como string.
 */
function formatPostgrestList(values: string[]): string {
    return `(${values.map(v => (
        /[,()"\\]/.test(v) ? `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : v
    )).join(',')})`;
}

function buildBaseJobQuery(selectString: string, criteria: SearchCriteria, quickSearchTerm: string, signal?: AbortSignal, linkFilter?: JobLinkFilter | null, selectOptions?: { head?: boolean }) {
    let query = supabase.from('job_openings').select(selectString, { count: 'exact', head: selectOptions?.head });
    if (signal) {
        query = query.abortSignal(signal);
    }
    
    // Filtro por termo rápido (não salvo) — usa ilike em colunas-chave para
    // garantir match confiável de acrônimos (ex: "IBGE") que o dicionário
    // Português do FTS pode estemar/normalizar de forma inesperada.
    if (quickSearchTerm) {
        const term = quickSearchTerm.trim().replace(/[%,()]/g, '');
        if (term) {
            const pattern = `%${term}%`;
            query = query.or(`organization.ilike.${pattern},title.ilike.${pattern},location.ilike.${pattern}`);
        }
    }

    // Filtro por palavra-chave (salvo nos critérios) — mantém FTS para
    // buscas estruturadas com stemming Português.
    if (criteria.palavraChave) {
        const tsQuery = createTsQuery(criteria.palavraChave);
        if (tsQuery) {
            query = query.textSearch('searchable_text', tsQuery, { config: 'portuguese' });
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

    // Filtro por marcação de interesse do usuário ("Com interesse" / "Sem interesse" / agrupamento).
    // As listas de links são pequenas (apenas as marcações do próprio usuário, já carregadas
    // em memória), então restringir (`in`) ou excluir (`not_in`) por elas é seguro e barato.
    if (linkFilter) {
        if (linkFilter.mode === 'in') {
            // Lista vazia => nenhuma vaga pode satisfazer o filtro; usamos um valor
            // inexistente para que a consulta retorne naturalmente zero resultados.
            query = query.in('link', linkFilter.links.length > 0 ? linkFilter.links : ['__none__']);
        } else if (linkFilter.links.length > 0) {
            query = query.not('link', 'in', formatPostgrestList(linkFilter.links));
        }
    }

    return query;
}

export async function fetchJobs(criteria: SearchCriteria, page: number, pageSize: number, type: 'concurso' | 'processo_seletivo' | 'all', quickSearchTerm: string, signal?: AbortSignal, linkFilter?: JobLinkFilter | null) {
    const isDistanceSearch = criteria.distanciaRaio && criteria.cidadeFiltro && criteria.estado.length === 2;

    // Check cache first (skip for aborted requests)
    const cacheKey = buildCacheKey('fetchJobs', type, criteria, page, pageSize, quickSearchTerm, linkFilter ?? null);
    const cached = queryCache.get<{ jobs: ProcessedJob[]; count: number }>(cacheKey);
    if (cached) return cached;

    let query = buildBaseJobQuery(JOB_OPENINGS_LIST_COLUMNS, criteria, quickSearchTerm, signal, linkFilter);

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
            const result = { jobs, count: jobs.length };
            if (!signal?.aborted) queryCache.set(cacheKey, result);
            return result;
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
        const result = { jobs, count: count ?? 0 };
        if (!signal?.aborted) queryCache.set(cacheKey, result);
        return result;
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

/**
 * Busca vagas paginadas com agrupamento GLOBAL por marcação de interesse, respeitando
 * a ordenação escolhida (`criteria.sort`) dentro de cada grupo, na seguinte ordem:
 *   1) "Tenho interesse"     — ordenadas conforme `criteria.sort`
 *   2) Ainda não avaliadas   — ordenadas conforme `criteria.sort`
 *   3) "Não tenho interesse" — ordenadas conforme `criteria.sort`
 *
 * Diferente do agrupamento client-side (`applyInterestGrouping`, que reordena apenas
 * a página já carregada), esta função garante o agrupamento correto em TODA a base —
 * "encaixando" até três sub-consultas (uma por grupo) na janela de paginação solicitada,
 * sem precisar trazer todos os resultados para o cliente. Isso só é viável porque as
 * listas `interestedLinks`/`notInterestedLinks` são pequenas e conhecidas (apenas as
 * marcações do próprio usuário, já carregadas em memória).
 */
export async function fetchJobsGroupedByInterest(
    criteria: SearchCriteria,
    page: number,
    pageSize: number,
    type: 'concurso' | 'processo_seletivo' | 'all',
    quickSearchTerm: string,
    interestedLinks: string[],
    notInterestedLinks: string[],
    signal?: AbortSignal,
): Promise<{ jobs: ProcessedJob[]; count: number }> {
    const cacheKey = buildCacheKey('fetchJobsGroupedByInterest', type, criteria, page, pageSize, quickSearchTerm, interestedLinks, notInterestedLinks);
    const cached = queryCache.get<{ jobs: ProcessedJob[]; count: number }>(cacheKey);
    if (cached) return cached;

    type InterestGroupMode = 'interested' | 'unmarked' | 'not_interested';
    const allMarkedLinks = [...interestedLinks, ...notInterestedLinks];

    const buildGroupQuery = (selectString: string, mode: InterestGroupMode, selectOptions?: { head?: boolean }) => {
        let linkFilter: JobLinkFilter | null;
        if (mode === 'interested') linkFilter = { mode: 'in', links: interestedLinks };
        else if (mode === 'not_interested') linkFilter = { mode: 'in', links: notInterestedLinks };
        else linkFilter = allMarkedLinks.length > 0 ? { mode: 'not_in', links: allMarkedLinks } : null;

        let q = buildBaseJobQuery(selectString, criteria, quickSearchTerm, signal, linkFilter, selectOptions);
        if (type !== 'all') q = q.eq('type', type);

        // Mesma lógica de ordenação de `fetchJobs`, aplicada dentro de cada grupo.
        const { sort } = criteria;
        if (sort.startsWith('alpha')) q = q.order('organization', { ascending: sort === 'alpha-asc' });
        else if (sort.startsWith('salary')) q = q.order('max_salary_numeric', { ascending: sort === 'salary-asc', nullsFirst: false });
        else if (sort.startsWith('vacancies')) q = q.order('vacancies_numeric', { ascending: sort === 'vacancies-asc', nullsFirst: false });
        else if (sort.startsWith('deadline')) q = q.order('deadline_date', { ascending: sort === 'deadline-asc', nullsFirst: false });
        return q;
    };

    try {
        // 1) Conta cada grupo com consultas leves "head-only" (sem trazer linhas) —
        // pulamos a consulta quando já sabemos que o grupo está vazio (sem marcações daquele tipo).
        const countGroup = async (mode: InterestGroupMode, knownEmpty: boolean): Promise<number> => {
            if (knownEmpty) return 0;
            const result = await retryAsync(async () => {
                const r = await buildGroupQuery('link', mode, { head: true });
                if (r.error) throw r.error;
                return r;
            }, 3, 300);
            return result.count ?? 0;
        };

        const [countInterested, countUnmarked, countNotInterested] = await Promise.all([
            countGroup('interested', interestedLinks.length === 0),
            countGroup('unmarked', false),
            countGroup('not_interested', notInterestedLinks.length === 0),
        ]);

        const total = countInterested + countUnmarked + countNotInterested;

        // 2) Determina quais grupos a janela [from, to] da página solicitada cobre, e
        // busca apenas as fatias necessárias de cada um (no máximo 3 sub-buscas, já que
        // uma página de tamanho fixo pode, no pior caso, atravessar as duas fronteiras).
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const groups: { mode: InterestGroupMode; start: number; count: number }[] = [
            { mode: 'interested', start: 0, count: countInterested },
            { mode: 'unmarked', start: countInterested, count: countUnmarked },
            { mode: 'not_interested', start: countInterested + countUnmarked, count: countNotInterested },
        ];

        const fetchSlices = await Promise.all(groups.map(async (group) => {
            if (group.count === 0) return [] as any[];

            const groupEnd = group.start + group.count - 1;
            const sliceFrom = Math.max(from, group.start);
            const sliceTo = Math.min(to, groupEnd);
            if (sliceFrom > sliceTo) return [] as any[];

            const relativeFrom = sliceFrom - group.start;
            const relativeTo = sliceTo - group.start;

            const result = await retryAsync(async () => {
                const r = await buildGroupQuery(JOB_OPENINGS_LIST_COLUMNS, group.mode).range(relativeFrom, relativeTo);
                if (r.error) throw r.error;
                return r;
            }, 3, 300);
            return result.data || [];
        }));

        const jobs = fetchSlices.flat().map(jobMapper);
        const result = { jobs, count: total };
        if (!signal?.aborted) queryCache.set(cacheKey, result);
        return result;
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

        console.error(`Error fetching interest-grouped jobs (type: ${type}) after retries:`, error);

        let userMessage = 'Falha ao buscar vagas. Verifique sua conexão e tente novamente.';
        if (error.message && error.message.toLowerCase().includes('statement timeout')) {
            userMessage = 'A busca demorou demais para responder. Tente usar filtros mais específicos para refinar sua pesquisa.';
        }

        throw new Error(userMessage);
    }
}

export async function fetchJobsSummary(criteria: SearchCriteria, quickSearchTerm: string, signal?: AbortSignal, linkFilter?: JobLinkFilter | null) {
    // Check cache first — summary is expensive and changes rarely within a session
    const cacheKey = buildCacheKey('fetchJobsSummary', criteria, quickSearchTerm, linkFilter ?? null);
    const cached = queryCache.get<{ totalOpportunities: number; totalVacancies: number; highestSalary: number }>(cacheKey);
    if (cached) return cached;

    // Only select columns needed for summary to optimize payload
    let query = buildBaseJobQuery('vacancies_numeric, max_salary_numeric', criteria, quickSearchTerm, signal, linkFilter);

    try {
        // Fetch only the first batch. The total count comes from Supabase's
        // count:exact header (accurate), while vacancy/salary stats are
        // computed from this first batch (representative approximation).
        // This avoids iterating all pages, which hangs for popular terms.
        const { data, error, count } = await retryAsync(async () => {
            const result = await query.range(0, 999);
            if (result.error) throw result.error;
            return result;
        }, 3, 500);

        if (error) throw error;

        const pageData: any[] = data || [];

        const summary = pageData.reduce(
            (acc: { totalVacancies: number; highestSalary: number }, job: any) => {
                acc.totalVacancies += Number(job.vacancies_numeric) || 0;
                if ((Number(job.max_salary_numeric) || 0) > acc.highestSalary) {
                    acc.highestSalary = Number(job.max_salary_numeric) || 0;
                }
                return acc;
            },
            { totalVacancies: 0, highestSalary: 0 }
        );

        const result = { totalOpportunities: count ?? pageData.length, ...summary };
        if (!signal?.aborted) queryCache.set(cacheKey, result);
        return result;
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
    // Check cache first
    const cacheKey = buildCacheKey('fetchArticles', table, criteria, page, pageSize, quickSearchTerm);
    const cached = queryCache.get<{ items: ProcessedPredictedJob[]; count: number }>(cacheKey);
    if (cached) return cached;

    let query = supabase.from(table).select(PREDICTED_ARTICLES_COLUMNS, { count: 'exact' });
    if (signal) {
        query = query.abortSignal(signal);
    }

    const { searchTerm, location, month, year, sources, sort } = criteria;

    if (quickSearchTerm) {
        const term = quickSearchTerm.trim().replace(/[%,()]/g, '');
        if (term) {
            query = query.ilike('title', `%${term}%`);
        }
    }

    if (searchTerm) {
        const tsQuery = createTsQuery(searchTerm);
        if (tsQuery) {
            query = query.textSearch('normalized_title', tsQuery, { config: 'portuguese' });
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

    // Filtro de data por range (gte/lt) quando possível, permitindo uso de índice B-tree.
    // O formato YYYY-MM-DD garante ordenação lexicográfica correta para comparações de string.
    if (year !== 'todos' && month !== 'todos') {
        // Intervalo exato: [YYYY-MM-01, YYYY-(MM+1)-01)
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endYear = m === 12 ? y + 1 : y;
        const endMonth = m === 12 ? 1 : m + 1;
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
        query = query.gte('publication_date', startDate).lt('publication_date', endDate);
    } else if (year !== 'todos') {
        // Ano inteiro: [YYYY-01-01, (YYYY+1)-01-01)
        const y = parseInt(year, 10);
        query = query.gte('publication_date', `${y}-01-01`).lt('publication_date', `${y + 1}-01-01`);
    } else if (month !== 'todos') {
        // Mês sem ano: `publication_date` é do tipo `date` no Postgres, e o operador
        // `LIKE`/`~~` (usado por `.like()`) não existe para esse tipo — gerava o erro
        // "operator does not exist: date ~~ unknown" e quebrava a busca. Para filtrar
        // por mês independente do ano sem usar LIKE, combinamos (`.or()`) um intervalo
        // [gte, lt) por ano — usando os mesmos anos disponíveis no seletro "Ano" — o
        // que usa apenas operadores nativos de comparação de datas (compatíveis com
        // índice B-tree).
        const m = parseInt(month, 10);
        const orFilter = years.map(y => {
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const endYear = m === 12 ? y + 1 : y;
            const endMonth = m === 12 ? 1 : m + 1;
            const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
            return `and(publication_date.gte.${startDate},publication_date.lt.${endDate})`;
        }).join(',');
        query = query.or(orFilter);
    }

    if (sources && sources.length > 0) {
        query = query.in('source', sources);
    }

    // A ordenação é feita no banco de dados na coluna de texto `publication_date`,
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
        const result = { items, count: count ?? 0 };
        if (!signal?.aborted) queryCache.set(cacheKey, result);
        return result;
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
    // Check cache — sources change only when the scraper runs (infrequently)
    const cacheKey = buildCacheKey('fetchSources', table);
    const cached = queryCache.get<string[]>(cacheKey);
    if (cached) return cached;

    // Primary path: use the server-side RPC for a true SELECT DISTINCT.
    // Requires the `get_distinct_sources` function to be deployed (see migrations).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcResult = await (supabase as any).rpc('get_distinct_sources', { p_table: table });

    if (!rpcResult.error && rpcResult.data) {
        const sources = (rpcResult.data as { source: string }[])
            .map(row => row.source)
            .filter(Boolean)
            .sort();
        queryCache.set(cacheKey, sources, 10 * 60 * 1_000);
        return sources;
    }

    // Fallback (RPC not yet deployed, or unexpected error): fetch a sample and
    // deduplicate in JS. Sources repeat often enough that 500 rows cover all
    // distinct values for these tables.
    if (rpcResult.error && !rpcResult.error.message?.includes('Could not find the function')) {
        const lowerCaseMessage = (rpcResult.error.message || '').toLowerCase();
        if (lowerCaseMessage.includes('networkerror') || lowerCaseMessage.includes('failed to fetch')) {
            window.dispatchEvent(new CustomEvent('networkError'));
        }
        console.error(`Error fetching sources via RPC from ${table}:`, rpcResult.error);
    }

    const { data, error } = await supabase
        .from(table)
        .select('source')
        .not('source', 'is', null)
        .order('source')
        .limit(500);

    if (error) {
        const lowerCaseMessage = (error.message || '').toLowerCase();
        if (lowerCaseMessage.includes('networkerror') || lowerCaseMessage.includes('failed to fetch')) {
            window.dispatchEvent(new CustomEvent('networkError'));
        }
        console.error(`Error fetching sources (fallback) from ${table}:`, error);
        return [];
    }

    const sources = [...new Set((data || []).map((item: any) => item.source).filter(Boolean))].sort();
    queryCache.set(cacheKey, sources, 10 * 60 * 1_000);
    return sources;
}