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

// Esta função faz o scraping de vagas de concursos.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declara Deno para resolver erros de TypeScript em ambientes não-Deno.
declare const Deno: any;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const BASE_CONCURSOS_URL = 'https://www.pciconcursos.com.br/concursos/';
const REGIONS = [
  'nacional',
  'sudeste',
  'sul',
  'norte',
  'nordeste',
  'centrooeste'
];
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;
const MINIMUM_JOBS_THRESHOLD = 500; // Limite de segurança

const ESTADOS_POR_REGIAO = {
    'Sudeste': [
      { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'MG', nome: 'Minas Gerais' },
      { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'SP', nome: 'São Paulo' },
    ],
    'Sul': [
      { sigla: 'PR', nome: 'Paraná' }, { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'SC', nome: 'Santa Catarina' },
    ],
    'Centro-Oeste': [
      { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'GO', nome: 'Goiás' },
      { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    ],
    'Nordeste': [
      { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
      { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PE', nome: 'Pernambuco' },
      { sigla: 'PI', nome: 'Piauí' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'SE', nome: 'Sergipe' },
    ],
    'Norte': [
      { sigla: 'AC', nome: 'Acre' }, { sigla: 'AP', nome: 'Amapá' }, { sigla: 'AM', nome: 'Amazonas' },
      { sigla: 'PA', nome: 'Pará' }, { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'TO', nome: 'Tocantins' },
    ],
};
const allStates = Object.values(ESTADOS_POR_REGIAO).flat();
const EDUCATION_LEVELS = ['Fundamental', 'Médio', 'Técnico', 'Superior'];

// --- Funções Auxiliares ---
const normalizeText = (text: string | null | undefined): string =>
    text ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : "";

function getErrorMessage(error: any): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        return JSON.stringify(error);
    }
    return String(error);
}

async function retryAsync(operation: () => Promise<any>, maxRetries: number, delayMs: number) {
  let lastError: Error | null = null;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${getErrorMessage(error)}`);
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay / 1000}s before retrying...`);
        await new Promise((resolve)=>setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`Operation failed after ${maxRetries} attempts. Last error: ${getErrorMessage(lastError)}`);
}

function titleCase(str: string): string {
    if (!str) return '';
    const smallWords = /^(a|e|o|de|da|do|das|dos|em|um|uma|com|por|para)$/i;
    return str.toLowerCase().split(' ').map((word, index) => {
        if (index > 0 && smallWords.test(word)) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function extractEffectiveCity(orgao: string, titulo: string, localidade: string): string | null {
    // 1. Função interna para limpar e validar um nome de cidade potencial.
    const cleanAndValidate = (text: string | undefined): string | null => {
        if (!text) return null;
        
        let cleaned = text.trim();
        
        // Remove sufixos de estado (ex: "- SP", "/SC").
        cleaned = cleaned.replace(/(\s*[-\/,(]\s*[A-Z]{2})$/, '').trim();
        // Remove pontuação no final.
        cleaned = cleaned.replace(/[.,;]$/, '').trim();
        // Remove frases de ação comuns que não fazem parte do nome.
        cleaned = cleaned.replace(/\s+(?:abre|divulga|anuncia|promove|realiza|publica|retifica|comunica|informa)\s+.*$/i, '').trim();

        // Lista de palavras genéricas a serem ignoradas.
        const genericWords = /^(municipal|estadual|federal|do estado|gerais|vários cargos|diversos cargos|de|da|do|para|o|a|e|municipal de)$/i;
        if (genericWords.test(cleaned)) return null;

        // Validação final de sanidade.
        if (cleaned.length < 3 || cleaned.split(' ').length > 5) return null;
        
        return titleCase(cleaned);
    };

    // 2. Ordem de prioridade para buscar a cidade.
    const textsToSearch = [titulo, orgao];

    for (const text of textsToSearch) {
        if (!text) continue;

        // Padrão: "Prefeitura de [Cidade]"
        let match = text.match(/^(?:Prefeitura|Câmara|SAAE)\s+(?:Municipal\s+)?(?:de|da|do|da Estância Turística de)\s+([^-\/,(]+)/i);
        if (match && match[1]) {
            const city = cleanAndValidate(match[1]);
            if (city) return city;
        }
        // Padrão: "[Órgão] - [Cidade]"
        match = text.match(/-\s+([A-ZÀ-ÿ\s'-]+)$/);
        if (match && match[1]) {
            const city = cleanAndValidate(match[1]);
            if (city) return city;
        }
        // Padrão no título: "... em [Cidade]"
        if (text === titulo) {
            match = text.match(/\s+em\s+([A-ZÀ-ÿ\s'-]+?)(?:\s*[-\/,(]|\s+com\s+|$)/i);
            if (match && match[1]) {
                const city = cleanAndValidate(match[1]);
                if(city) return city;
            }
        }
    }
    
    // 3. Fallbacks
    // Fallback: Tenta extrair de "Prefeitura [Cidade]"
    const match = orgao.match(/^(?:Prefeitura|Câmara)\s+(?:Municipal\s+)?(.+)/i);
    if (match && match[1]) {
        const city = cleanAndValidate(match[1]);
        if (city) return city;
    }
    // Fallback: Usa o campo 'localidade' se não for apenas uma sigla de estado.
    if (localidade && localidade.trim().length > 2 && !/^[A-Z]{2}$/i.test(localidade.trim())) {
        const city = cleanAndValidate(localidade.split(/[\/-]/)[0]);
        if (city) return city;
    }

    return null;
}

function formatSalaryString(salaryText: string | null): string | null {
    if (!salaryText || !/\d/.test(salaryText) || !salaryText.toLowerCase().includes('r$')) {
        return salaryText;
    }

    return salaryText.replace(/([\d\.,]+)/g, (match) => {
        const number = parseFloat(match.replace(/\./g, '').replace(',', '.'));
        if (isNaN(number) || number < 100) {
            return match;
        }
        return number.toLocaleString('pt-BR', {
             minimumFractionDigits: 2,
             maximumFractionDigits: 2
        });
    });
}

function parseSalaryAndVacancies(text: string | undefined): { vacancies: string | null; salary: string | null } {
    if (!text || text.toLowerCase().includes('não informado')) {
        return { vacancies: null, salary: 'Não informado' };
    }

    let salaryText = text;
    const foundVacancies: string[] = [];

    // Regex to find both numeric vacancies and "CR"
    const vacancyRegex = /(\b(?:cr|cadastro de reserva)\b)|([\d\.]+)\s+vagas?/ig;
    
    // Store matches to avoid issues with modifying the string during iteration
    const matches = Array.from(salaryText.matchAll(vacancyRegex));

    matches.forEach(match => {
        const fullMatch = match[0];
        if (match[1]) { // Matched CR
            if (!foundVacancies.includes('Cadastro Reserva')) {
                foundVacancies.push('Cadastro Reserva');
            }
        } else if (match[2]) { // Matched numeric vagas
            foundVacancies.push(fullMatch.trim());
        }
        // Replace matched part in the original string
        salaryText = salaryText.replace(fullMatch, '');
    });
    
    const vacancies = foundVacancies.length > 0 ? foundVacancies.join(' + ') : null;

    let finalSalary = salaryText.replace(/^[/\s•,-]+|[/\s•,-]+$/g, '').trim();

    if (/^vagas?$/i.test(finalSalary) || finalSalary === '') {
        finalSalary = 'Não informado';
    } else if (/\ba combinar\b/i.test(finalSalary)) {
        finalSalary = 'A combinar';
    } else {
        const ateMatch = finalSalary.match(/até\s+(.*)/i);
        if (ateMatch && ateMatch[1]) {
            finalSalary = `Até ${ateMatch[1].trim()}`;
        } else if (!finalSalary.toUpperCase().includes('R$') && /\d/.test(finalSalary)) {
            finalSalary = `Até R$ ${finalSalary}`;
        }
    }

    const formattedSalary = formatSalaryString(finalSalary);

    return {
        vacancies: vacancies ? `${vacancies.charAt(0).toUpperCase()}${vacancies.slice(1)}` : null,
        salary: (formattedSalary !== 'Não informado' && formattedSalary) ? formattedSalary : null
    };
}

function parseRolesAndEducation(text: string | undefined): { roles: string[]; levels: string[] } {
    if (!text) return { roles: [], levels: [] };
    const parts = text.split(/[\/,]/).map(part => part.trim()).filter(Boolean);
    const uniqueParts = [...new Set(parts)];
    const roles: string[] = [];
    const levels: string[] = [];
    uniqueParts.forEach(part => {
      let isLevel = false;
      for (const level of EDUCATION_LEVELS) {
          if (part.toLowerCase().includes(level.toLowerCase())) {
              const formattedLevel = `Nível ${level}`;
              if (!levels.includes(formattedLevel)) levels.push(formattedLevel);
              isLevel = true;  
          }
      }
      if (!isLevel && !part.toLowerCase().includes('vários cargos')) roles.push(part);
    });
    const levelOrder = EDUCATION_LEVELS.map(l => `Nível ${l}`);
    levels.sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b));
    return { roles, levels };
}

function getNumericValuesFromSalaryText(text: string): number[] {
    if (!text || text.toLowerCase().includes('não informado') || text.toLowerCase().includes('a combinar')) return [];
    const salaryOnlyText = text.replace(/(\d+)\s+vagas?/gi, '');
    const numbers = salaryOnlyText.match(/[\d\.,]+/g) || [];
    if (numbers.length === 0) return [];
    let numericValues = numbers.map(numStr => parseFloat(numStr.replace(/\./g, '').replace(',', '.'))).filter(num => !isNaN(num));
    if (numericValues.length > 1) {
        const maxVal = Math.max(...numericValues);
        if (maxVal > 100) numericValues = numericValues.filter(n => n >= 15);
    }
    const lowerText = text.toLowerCase();
    if (/\b(h|hora|h\/a|por hora)\b/.test(lowerText)) return numericValues.map(n => n * 176);
    if (/\b(d|dia|diária|diaria)\b/.test(lowerText)) return numericValues.map(n => n * 22);
    return numericValues;
}

function parseMaxSalary(text: string | undefined): number {
    if (!text) return 0;
    const numericValues = getNumericValuesFromSalaryText(text);
    return numericValues.length === 0 ? 0 : Math.max(...numericValues);
}
function parseMinSalary(text: string | undefined): number {
    if (!text) return 0;
    const numericValues = getNumericValuesFromSalaryText(text);
    return numericValues.length === 0 ? 0 : Math.min(...numericValues);
}
function parseNumericVacancies(text: string | undefined): number {
  if (!text) return 0;
  // Use 'g' flag to find all matches
  const matches = text.match(/([\d\.]+)\s+vagas?/ig);
  if (!matches) return 0;

  return matches.reduce((sum, match) => {
    // Extract the numeric part from each match
    const numMatch = match.match(/([\d\.]+)/);
    if (numMatch && numMatch[1]) {
        const numberString = numMatch[1].replace(/\./g, '');
        return sum + (parseInt(numberString, 10) || 0);
    }
    return sum;
  }, 0);
}

/**
 * Analisa o texto do prazo de inscrição para extrair datas e formatar uma string de exibição.
 * @param text O texto bruto do prazo, ex: "de 10/08/2024 a 20/09/2024" ou "Verificar edital28/10/2025".
 * @returns Um objeto contendo a data final para ordenação (ISO string) e o prazo formatado para exibição.
 */
function parseDeadlineInfo(text: string | null | undefined): { dateForSort: string | null; formatted: string | null } {
    if (!text) {
        return { dateForSort: null, formatted: null };
    }

    // Adiciona um espaço se houver uma palavra seguida por uma data sem espaço.
    const spacedText = text.replace(/([a-zA-Zá-úÁ-Ú])(\d{1,2}\/\d{1,2})/g, '$1 $2');
    const lowerText = spacedText.toLowerCase();

    // Extrai todas as datas válidas do texto
    const dateRegex = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
    const dates: Date[] = [];
    const currentYear = new Date().getFullYear();

    let match;
    while ((match = dateRegex.exec(lowerText)) !== null) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        let year = match[3] ? parseInt(match[3], 10) : currentYear;

        if (year < 100) {
            year += 2000;
        }

        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
            const dateObj = new Date(Date.UTC(year, month - 1, day));
            if (dateObj.getUTCMonth() === month - 1) {
                dates.push(dateObj);
            }
        }
    }

    // Se nenhuma data foi encontrada, retorna o texto original (com espaço corrigido).
    if (dates.length === 0) {
        return { dateForSort: null, formatted: spacedText.charAt(0).toUpperCase() + spacedText.slice(1) };
    }

    dates.sort((a, b) => a.getTime() - b.getTime());
    
    const formatDate = (date: Date) => {
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    };

    const firstDateStr = formatDate(dates[0]);
    const lastDate = dates[dates.length - 1];
    const lastDateStr = formatDate(lastDate);

    let datePart: string;
    if (dates.length > 1 && firstDateStr !== lastDateStr) {
        datePart = `De ${firstDateStr} a ${lastDateStr}`;
    } else {
        datePart = `Até ${lastDateStr}`;
    }

    // Extrai o texto que não é data para usar como prefixo.
    const residualText = spacedText
        .replace(dateRegex, '') // Remove as datas
        .replace(/\s*(de|a|até)\s*$/i, '') // Remove conectivos comuns no final
        .replace(/^[-\s]+/, '') // Remove hífens no início
        .trim();
    
    const statusKeywords = ['prorrogado', 'reaberto', 'verificar', 'conferir'];
    const hasStatusKeyword = statusKeywords.some(kw => lowerText.includes(kw));

    let formatted = datePart;
    if (hasStatusKeyword && residualText) {
        const capitalizedResidual = residualText.charAt(0).toUpperCase() + residualText.slice(1);
        formatted = `${capitalizedResidual} (${datePart})`;
    } else if (lowerText.includes('prorrogado') || lowerText.includes('reaberto')) {
        formatted = `Prorrogado: ${formatted}`;
    }

    return {
        dateForSort: lastDate.toISOString(),
        formatted: formatted
    };
}


// --- Lógica de Scraping ---
async function scrapeAllJobs() {
  const jobLinks = new Set();
  const parseJobsFromDoc = (doc: Document, baseUrl: string)=>{
    const jobs = [];
    const jobElements = Array.from(doc.querySelectorAll('div.da, div.na, div.ea'));
    jobElements.forEach((el: Element)=>{
      try {
        const linkElement = el.querySelector('.ca a');
        const locationElement = el.querySelector('.cc');
        const detailsElement = el.querySelector('.cd');
        const logoElement = el.querySelector('.cb img');
        const deadlineElement = el.querySelector('.ce');
        if (linkElement && detailsElement) {
          const href = linkElement.getAttribute('href');
          if (!href) return;
          const link = new URL(href, baseUrl).href;
          if (jobLinks.has(link)) return;
          jobLinks.add(link);
          
          const orgao = linkElement.textContent?.trim() || 'Órgão não informado';
          const titulo = linkElement.getAttribute('title') || orgao;
          let localidade = locationElement?.textContent?.trim() || 'Nacional';
          if (!localidade || localidade === ' ') localidade = 'Nacional';
          
          const allSpans = Array.from(detailsElement.querySelectorAll('span'));
          const escolaridade = allSpans.length > 0 ? allSpans.map((s: Element)=>s.textContent?.trim()).filter(Boolean).join(' / ') : 'Não informada';
          
          let salario = 'Não informado';
          const clonedDetails = detailsElement.cloneNode(true) as Element;
          clonedDetails.querySelectorAll('span').forEach((span)=>span.remove());
          let salaryText = clonedDetails.textContent?.replace(/\s+/g, ' ').trim() || '';
          if (salaryText.startsWith('/')) salaryText = salaryText.substring(1).trim();
          if (salaryText.startsWith('•')) salaryText = salaryText.substring(1).trim();
          if (salaryText) salario = salaryText;
          
          const cidadeEfetiva = extractEffectiveCity(orgao, titulo, localidade);
          const logoUrl = logoElement?.getAttribute('data-src');
          const prazoInscricao = deadlineElement?.textContent?.trim().replace(/\s+/g, ' ') || null;

          const { dateForSort: prazoInscricaoData, formatted: prazoInscricaoFormatado } = parseDeadlineInfo(prazoInscricao);
          
          const { vacancies: vacanciesFromSalary, salary: parsedSalaryFromText } = parseSalaryAndVacancies(salario);
          const { vacancies: vacanciesFromTitle } = parseSalaryAndVacancies(titulo);
          const parsedVacancies = vacanciesFromSalary || vacanciesFromTitle;
          const { levels, roles } = parseRolesAndEducation(escolaridade);
          const searchableText = normalizeText(`${orgao} ${titulo} ${localidade} ${escolaridade}`);
          const mentionedStates = new Set<string>();
          const textToScan = `${orgao} ${titulo} ${localidade}`;
          allStates.forEach(state => {
              const siglaRegex = new RegExp(`(?<![a-zA-ZÀ-ÿ])${state.sigla}(?![a-zA-ZÀ-ÿ])`, 'i');
              const nomeRegex = new RegExp(`\\b${state.nome}\\b`, 'i');
              if (siglaRegex.test(textToScan) || nomeRegex.test(textToScan)) {
                  mentionedStates.add(state.sigla);
              }
          });
          
          const job = {
            titulo, orgao, localidade, salario, escolaridade, link,
            cidadeEfetiva: cidadeEfetiva,
            logoUrl: logoUrl,
            prazoInscricao: prazoInscricao,
            prazoInscricaoData: prazoInscricaoData,
            prazoInscricaoFormatado: prazoInscricaoFormatado,
            parsedVacancies,
            parsedSalary: parsedSalaryFromText,
            educationLevels: levels,
            parsedRoles: roles,
            searchableText,
            mentionedStates: Array.from(mentionedStates).sort(),
          };
          jobs.push(job);
        }
      } catch (error) {
        console.error('Error parsing a single job item, skipping. Error:', getErrorMessage(error));
      }
    });
    return jobs;
  };
  const scrapePromises = REGIONS.map(async (region)=>{
    const url = `${BASE_CONCURSOS_URL}${region}/`;
    try {
      const htmlText = await retryAsync(async ()=>{
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed for region ${region} with status ${response.status}`);
        return await response.text();
      }, MAX_RETRIES, INITIAL_RETRY_DELAY_MS);
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      if (!doc) return [];
      const jobs = parseJobsFromDoc(doc, url);
      console.log(`Region ${region}: found ${jobs.length} jobs.`);
      return jobs;
    } catch (error) {
      console.error(`Error scraping region ${region}:`, getErrorMessage(error));
      return [];
    }
  });
  const results = await Promise.all(scrapePromises);
  return results.flat();
}

// --- Servidor Principal ---
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS_HEADERS
    });
  }
  try {
    console.log("Job scraping started...");
    const runId = crypto.randomUUID();
    const allJobs = await scrapeAllJobs();
    console.log(`Job scraping finished. Found ${allJobs.length} jobs. Upserting into database with run_id: ${runId}`);
    
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    
    // NOTA: Para este código funcionar, a tabela 'job_openings' precisa de uma nova coluna chamada 'last_run_id' (TEXT ou UUID).
    const jobsToUpsert = allJobs.map((job) => ({
        title: job.titulo,
        organization: job.orgao,
        location: job.localidade,
        salary_text: job.salario,
        education_level_text: job.escolaridade,
        link: job.link,
        city: job.cidadeEfetiva || undefined,
        effective_city: job.cidadeEfetiva,
        logo_url: job.logoUrl,
        deadline_text: job.prazoInscricao,
        deadline_date: job.prazoInscricaoData,
        deadline_formatted: job.prazoInscricaoFormatado,
        source: 'PCI Concursos',
        searchable_text: job.searchableText,
        type: (/\bprocesso seletivo\b/i.test(job.searchableText)) ? 'processo_seletivo' : 'concurso',
        normalized_effective_city: normalizeText(job.cidadeEfetiva),
        max_salary_numeric: parseMaxSalary(job.salario),
        min_salary_numeric: parseMinSalary(job.salario),
        vacancies_numeric: parseNumericVacancies(job.parsedVacancies),
        education_levels: job.educationLevels,
        parsed_salary_text: job.parsedSalary,
        parsed_vacancies_text: job.parsedVacancies,
        parsed_roles: job.parsedRoles,
        mentioned_states: job.mentionedStates,
        last_run_id: runId
    }));
      
    const { error: upsertError } = await supabaseAdmin.from('job_openings').upsert(jobsToUpsert, { onConflict: 'link' });
    if (upsertError) throw new Error(`Failed to upsert jobs: ${getErrorMessage(upsertError)}`);

    let deletedCount = 0;
    // SALVAGUARDA: Apenas deleta registros antigos se o scraping encontrou um número razoável de vagas.
    if (jobsToUpsert.length > MINIMUM_JOBS_THRESHOLD) {
        console.log(`Deleting stale jobs (not part of run_id ${runId})...`);
        const { data: deleteData, error: deleteError } = await supabaseAdmin
            .from('job_openings')
            .delete()
            .neq('last_run_id', runId);

        if (deleteError) {
            console.error(`Failed to delete stale jobs: ${getErrorMessage(deleteError)}`);
        } else {
            deletedCount = Array.isArray(deleteData) ? deleteData.length : 0;
            console.log(`Deleted ${deletedCount} stale jobs.`);
        }
    } else {
        console.warn(`SECURITY SAFEGUARD: Scraping returned only ${jobsToUpsert.length} jobs, which is below the threshold of ${MINIMUM_JOBS_THRESHOLD}. Skipping delete operation to prevent accidental data loss.`);
    }
    
    const responseBody = {
      message: `Scraping complete. Upserted/updated ${allJobs.length} jobs. Deleted ${deletedCount} stale jobs.`
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, status: 200
    });
  } catch (error) {
    console.error("Main function error:", error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, status: 500
    });
  }
});