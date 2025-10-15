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

// NOTE: This service fetches pre-scraped data from the backend; it does not perform scraping on the client-side.
// The name is a remnant from an earlier project structure. Renaming it is avoided to prevent file duplication within the current environment.
import { ProcessedJob, ProcessedPredictedJob } from '../types';
import { supabase } from '../utils/supabase';

// The scraping logic has been moved to a Supabase Edge Function.
// This service now fetches the pre-scraped data from Supabase tables.

const PAGE_SIZE = 1000; // Supabase's default select limit

const JOB_OPENINGS_COLUMNS = 'title, organization, location, salary_text, education_level_text, link, city, effective_city, logo_url, deadline_text, deadline_formatted, deadline_date, source, type, normalized_effective_city, max_salary_numeric, min_salary_numeric, vacancies_numeric, education_levels, parsed_salary_text, parsed_vacancies_text, parsed_roles, mentioned_states';
const PREDICTED_ARTICLES_COLUMNS = 'publication_date, title, link, source, mentioned_states';

// --- Tipos para as linhas do banco de dados ---
interface JobOpeningRow {
    title: string;
    organization: string;
    location: string;
    salary_text: string;
    education_level_text: string;
    link: string;
    city: string | null;
    effective_city: string | null;
    logo_url: string | null;
    deadline_text: string | null;
    deadline_formatted: string | null;
    deadline_date: string | null;
    source: string;
    searchable_text: string;
    type: 'concurso' | 'processo_seletivo';
    normalized_effective_city: string | null;
    max_salary_numeric: number | null;
    min_salary_numeric: number | null;
    vacancies_numeric: number | null;
    education_levels: string[] | null;
    parsed_salary_text: string | null;
    parsed_vacancies_text: string | null;
    parsed_roles: string[] | null;
    mentioned_states: string[] | null;
}

interface PredictedArticleRow {
    publication_date: string;
    title: string;
    link: string;
    source: string;
    normalized_title: string;
    mentioned_states: string[] | null;
}

const jobMapper = (item: unknown): ProcessedJob => {
    const dbRow = item as JobOpeningRow;
    return {
        titulo: dbRow.title,
        orgao: dbRow.organization,
        localidade: dbRow.location,
        salario: dbRow.salary_text,
        escolaridade: dbRow.education_level_text,
        link: dbRow.link,
        cidade: dbRow.city || undefined,
        cidadeEfetiva: dbRow.effective_city,
        logoUrl: dbRow.logo_url || undefined,
        prazoInscricao: dbRow.deadline_text || undefined,
        prazoInscricaoFormatado: dbRow.deadline_formatted,
        prazoInscricaoData: dbRow.deadline_date,
        fonte: dbRow.source,
        type: dbRow.type,
        normalizedCidadeEfetiva: dbRow.normalized_effective_city || '',
        maxSalaryNum: Number(dbRow.max_salary_numeric) || 0,
        minSalaryNum: Number(dbRow.min_salary_numeric) || 0,
        vacanciesNum: Number(dbRow.vacancies_numeric) || 0,
        educationLevels: dbRow.education_levels || [],
        parsedSalary: dbRow.parsed_salary_text,
        parsedVacancies: dbRow.parsed_vacancies_text,
        parsedRoles: dbRow.parsed_roles || [],
        mentionedStates: dbRow.mentioned_states || [],
    };
};

const predictedJobMapper = (item: unknown): ProcessedPredictedJob => {
    const dbRow = item as PredictedArticleRow;
    const [day, month, year] = dbRow.publication_date.split('/').map(Number);
    return {
        date: dbRow.publication_date,
        title: dbRow.title,
        link: dbRow.link,
        source: dbRow.source,
        dateObject: new Date(year, month - 1, day),
        mentionedStates: dbRow.mentioned_states || [],
    };
};

/**
 * Fetches all records from a specified Supabase table by paginating through the results
 * in parallel for maximum speed.
 * @param tableName The name of the table to fetch from.
 * @param columns A string of comma-separated column names to select.
 * @returns A promise that resolves to an array of all records.
 */
async function fetchAllFromTable(tableName: string, columns: string): Promise<unknown[]> {
    const { count, error: countError } = await supabase
        .from(tableName)
        .select(columns, { count: 'exact', head: true });

    if (countError) {
        console.error(`Error counting rows from ${tableName}:`, countError);
        throw new Error(`Failed to count rows from ${tableName}: ${countError.message}`);
    }

    if (count === null || count === 0) {
        return [];
    }

    const pageCount = Math.ceil(count / PAGE_SIZE);
    const fetchPromises = [];

    for (let page = 0; page < pageCount; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        fetchPromises.push(supabase.from(tableName).select(columns).range(from, to));
    }

    const pageResults = await Promise.all(fetchPromises);

    const allData: unknown[] = [];
    for (const result of pageResults) {
        if (result.error) {
            console.error(`Error fetching a page from ${tableName}:`, result.error);
            throw new Error(`Failed to fetch a page from ${tableName}: ${result.error.message}`);
        }
        if (result.data) {
            allData.push(...result.data);
        }
    }
    return allData;
}


/**
 * A generic function to fetch all data from a table and map it to a specific type.
 * @param tableName The name of the table to fetch data from.
 * @param columns A string of comma-separated column names to select.
 * @param mapper A function to map a raw database item to the desired type.
 * @returns A promise that resolves to an array of mapped items.
 */
async function fetchAndMapTable<T>(tableName: string, columns: string, mapper: (item: unknown) => T): Promise<T[]> {
    const rawData = await fetchAllFromTable(tableName, columns);
    return (rawData || []).map(mapper);
}


export async function fetchAllData(): Promise<{ allJobs: ProcessedJob[], allPredictedJobs: ProcessedPredictedJob[], allNews: ProcessedPredictedJob[] }> {
    try {
        const [allJobs, allPredictedJobs, allNews] = await Promise.all([
            fetchAndMapTable('job_openings', JOB_OPENINGS_COLUMNS, jobMapper),
            fetchAndMapTable('predicted_openings', PREDICTED_ARTICLES_COLUMNS, predictedJobMapper),
            fetchAndMapTable('news_articles', PREDICTED_ARTICLES_COLUMNS, predictedJobMapper)
        ]);
        
        return { allJobs, allPredictedJobs, allNews };
    } catch (error) {
        console.error("Data fetching service error:", error);
        throw new Error("Não foi possível carregar os dados dos concursos. Isso pode ser um problema temporário. Por favor, tente recarregar a página em alguns instantes.");
    }
}