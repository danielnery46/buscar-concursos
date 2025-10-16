
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
// FIX: Import normalizeText from its dedicated module.
import { normalizeText } from '../utils/text';
import { ESTADOS_POR_REGIAO, VIZINHANCAS_ESTADOS } from '../constants';

const JOB_OPENINGS_LIST_COLUMNS = 'title, organization, location, link, effective_city, logo_path, deadline_formatted, deadline_date, type, normalized_effective_city, max_salary_numeric, min_salary_numeric, vacancies_numeric, education_levels, parsed_salary_text, parsed_vacancies_text, mentioned_states';
const PREDICTED_ARTICLES_COLUMNS = 'id, publication_date, title, link, source, mentioned_states';

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
    parsedRoles: [], // Not used in UI, providing fallback
    mentionedStates: item.mentioned_states || [],
});

const predictedJobMapper = (item: any): ProcessedPredictedJob => {
    const [day, month, year] = item.publication_date.split('/').map(Number);
    return {
        date: item.publication_date,
        title: item.title,
        link: item.link,
        source: item.source,
        dateObject: new Date(year, month - 1, day),
        mentionedStates: item.mentioned_states || [],
    };
};

function buildBaseJobQuery(criteria: SearchCriteria, signal?: AbortSignal) {
    let query = supabase.from('job_openings').select(JOB_OPENINGS_LIST_COLUMNS, { count: 'exact' });
    if (signal) {
        query = query.abortSignal(signal);
    }

    if (criteria.palavraChave) {
        query = query.ilike('searchable_text', `%${normalizeText(criteria.palavraChave)}%`);
    }

    if (criteria.escolaridade && criteria.escolaridade.length > 0) {
        // FIX: Use .or() with 'cs' (contains) for jsonb array filtering instead of 'ov'
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
                const regionStates = ESTADOS_POR_REGIAO[regionKey].map(s => s.sigla);
                // FIX: Use .or() with 'cs' (contains) for jsonb array filtering instead of 'ov'
                const orFilter = regionStates.map(state => `mentioned_states.cs.["${state}"]`).join(',');
                query = query.or(orFilter);
            }
        } else {
            const targetStates = [criteria.estado.toUpperCase()];
            if (criteria.incluirVizinhos && VIZINHANCAS_ESTADOS[criteria.estado.toUpperCase()]) {
                targetStates.push(...VIZINHANCAS_ESTADOS[criteria.estado.toUpperCase()]);
            }
            // FIX: Use .or() with 'cs' (contains) for jsonb array filtering instead of 'ov'
            const orFilter = targetStates.map(state => `mentioned_states.cs.["${state}"]`).join(',');
            query = query.or(orFilter);
        }
    }
    
    if (criteria.cidadeFiltro && criteria.estado.length === 2 && !isDistanceSearch) {
        query = query.eq('normalized_effective_city', normalizeText(criteria.cidadeFiltro));
    }
    return query;
}

export async function fetchJobs(criteria: SearchCriteria, page: number, pageSize: number, type: 'concurso' | 'processo_seletivo' | 'all', signal?: AbortSignal) {
    const isDistanceSearch = criteria.distanciaRaio && criteria.cidadeFiltro && criteria.estado.length === 2;
    let query = buildBaseJobQuery(criteria, signal);
    
    if (type !== 'all') {
        query = query.eq('type', type);
    }

    const { sort } = criteria;
    if (sort.startsWith('alpha')) query = query.order('organization', { ascending: sort === 'alpha-asc' });
    else if (sort.startsWith('salary')) query = query.order('max_salary_numeric', { ascending: sort === 'salary-asc', nullsFirst: false });
    else if (sort.startsWith('vacancies')) query = query.order('vacancies_numeric', { ascending: sort === 'vacancies-asc', nullsFirst: false });
    else if (sort.startsWith('deadline')) query = query.order('deadline_date', { ascending: sort === 'deadline-asc', nullsFirst: false });
    
    if (!isDistanceSearch) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) {
        console.error(`Error fetching jobs (type: ${type}):`, error);
        throw new Error(`Failed to fetch jobs`);
    }

    const jobs = (data || []).map(jobMapper);
    return { jobs, count: count ?? 0 };
}

export async function fetchJobsSummary(criteria: SearchCriteria, signal?: AbortSignal) {
    let query = buildBaseJobQuery(criteria, signal);
    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching jobs summary:', error);
        return { totalOpportunities: 0, totalVacancies: 0, highestSalary: 0 };
    }

    const summary = (data || []).reduce(
        (acc, job) => {
            acc.totalVacancies += Number(job.vacancies_numeric) || 0;
            if ((Number(job.max_salary_numeric) || 0) > acc.highestSalary) {
                acc.highestSalary = Number(job.max_salary_numeric) || 0;
            }
            return acc;
        },
        { totalVacancies: 0, highestSalary: 0 }
    );

    return { totalOpportunities: count ?? 0, ...summary };
}

export async function fetchArticles(table: 'predicted_openings' | 'news_articles', criteria: PredictedCriteria, page: number, pageSize: number, signal?: AbortSignal) {
    let query = supabase.from(table).select(PREDICTED_ARTICLES_COLUMNS, { count: 'exact' });
    if (signal) {
        query = query.abortSignal(signal);
    }

    const { searchTerm, location, month, year, sources, sort } = criteria;

    if (searchTerm) {
        query = query.ilike('normalized_title', `%${normalizeText(searchTerm)}%`);
    }

    if (location !== 'brasil') {
        if (location.startsWith('regiao-')) {
            const regionKeyRaw = location.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            if (regionKey) {
                const regionStates = ESTADOS_POR_REGIAO[regionKey].map(s => s.sigla);
                // FIX: Use .or() with 'cs' (contains) for jsonb array filtering
                const orFilter = regionStates.map(state => `mentioned_states.cs.["${state}"]`).join(',');
                query = query.or(orFilter);
            }
        } else {
            // FIX: Use .or() with a 'cs' filter string to correctly query the jsonb array.
            const orFilter = `mentioned_states.cs.["${location.toUpperCase()}"]`;
            query = query.or(orFilter);
        }
    }
    
    // Filtro de data por string matching (dd/mm/yyyy)
    if (year !== 'todos') {
        const datePattern = `%/${month !== 'todos' ? String(month).padStart(2, '0') : '%'}/${year}`;
        query = query.like('publication_date', datePattern);
    } else if (month !== 'todos') {
        const datePattern = `%/${String(month).padStart(2, '0')}/%`;
        query = query.like('publication_date', datePattern);
    }

    if (sources && sources.length > 0) {
        query = query.in('source', sources);
    }
    
    // A ordenação por data com uma coluna de texto não é ideal no DB.
    // Usamos o ID como um proxy razoável para a ordem de inserção.
    query = query.order('id', { ascending: sort === 'date-asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
        console.error(`Error fetching articles from ${table}:`, error);
        throw new Error(`Failed to fetch articles from ${table}`);
    }

    const items = (data || []).map(predictedJobMapper);
    
    // A ordenação final por data real é feita no lado do cliente para a página atual.
    items.sort((a, b) => {
        const timeA = a.dateObject.getTime();
        const timeB = b.dateObject.getTime();
        return sort === 'date-asc' ? timeA - timeB : timeB - a.dateObject.getTime();
    });

    return { items, count: count ?? 0 };
}
