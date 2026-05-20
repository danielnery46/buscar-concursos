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

// Importações necessárias
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";

// Declare Deno to resolve TypeScript errors in non-Deno environments.
declare const Deno: any;

// --- Variáveis de Configuração ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const MAX_PAGES_TO_SCRAPE = 5; // Máximo de páginas a buscar por fonte
const MAX_RETRIES = 3; // Tentativas em caso de falha de rede
const INITIAL_RETRY_DELAY_MS = 1000; // Atraso inicial para nova tentativa
const REQUEST_DELAY_MS = 250; // Atraso entre as buscas para não sobrecarregar os sites
const CONSECUTIVE_EMPTY_THRESHOLD = 5; // Para de buscar se encontrar 5 páginas vazias em sequência
const BATCH_SIZE = 100; // Tamanho do lote para inserção no banco de dados

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

function normalizarData(textoData: string | null | undefined): string {
    const getHojeFormatado = (): string => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };

    if (!textoData || typeof textoData !== 'string') {
        return getHojeFormatado();
    }
    const texto = textoData.toLowerCase().trim();

    // Tenta formato "DD/MM/YYYY" ou "DD/MM/YY"
    let match = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
        const dia = match[1].padStart(2, '0');
        const mes = match[2].padStart(2, '0');
        let ano = match[3];
        if (ano.length === 2) {
            ano = `20${ano}`;
        }
        return `${ano}-${mes}-${dia}`;
    }

    // Tenta formato "DD de [mês] de YYYY"
    const meses: { [key: string]: string } = {
        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
        'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };
    match = texto.match(/(\d{1,2}) de (\w+) de (\d{4})/);
    if (match) {
        const dia = match[1].padStart(2, '0');
        const mes = meses[match[2]];
        const ano = match[3];
        if (dia && mes && ano) return `${ano}-${mes}-${dia}`;
    }

    return getHojeFormatado(); // Fallback final
}

async function retryAsync(operation: () => Promise<any>, maxRetries: number, delayMs: number) {
  let lastError: Error | null = null;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${attempt} falhou: ${getErrorMessage(error)}`);
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve)=>setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`Operação falhou após ${maxRetries} tentativas. Último erro: ${getErrorMessage(lastError)}`);
}

const getMentionedStates = (title: string): string[] => {
    return allStates
        .filter(state => {
            const siglaRegex = new RegExp(`(?<![a-zA-ZÀ-ÿ])${state.sigla}(?![a-zA-ZÀ-ÿ])`, 'i');
            const nomeRegex = new RegExp(`\\b${state.nome}\\b`, 'i');
            return siglaRegex.test(title) || nomeRegex.test(title);
        })
        .map(state => state.sigla);
};

// --- Lógica de Scraping Principal ---
async function scrapeAndInsertInBatches(config: any, supabase: any, linksJaProcessados: Set<string>) {
  let batch = [];
  let totalProcessadoNestaFonte = 0;
  let pageNum = 1;
  let consecutiveEmptyPages = 0;
  console.log(`--- Iniciando scraping para: ${config.sourceName} ---`);
  while(pageNum <= MAX_PAGES_TO_SCRAPE){
    try {
      const url = config.getPageUrl(pageNum);
      const htmlText = await retryAsync(async ()=>{
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status: ${response.status} na página ${pageNum}`);
        return await response.text();
      }, MAX_RETRIES, INITIAL_RETRY_DELAY_MS);
      let pageJobs = [];
      try {
        const doc = new DOMParser().parseFromString(htmlText, "text/html");
        if (!doc) throw new Error("Parser retornou documento nulo.");
        pageJobs = config.parseFunction(doc, config.baseUrl);
      } catch (parseError) {
        console.error(`!! ERRO DE PARSING na página ${pageNum} de ${config.sourceName}. Pulando página. Erro: ${getErrorMessage(parseError)}`);
        pageNum++;
        continue;
      }
      if (pageJobs.length === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= CONSECUTIVE_EMPTY_THRESHOLD) {
          console.log(`Parando ${config.sourceName} após ${CONSECUTIVE_EMPTY_THRESHOLD} páginas vazias.`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
        const novosConcursosUnicos = [];
        for (const concurso of pageJobs){
          if (!linksJaProcessados.has(concurso.link)) {
            novosConcursosUnicos.push(concurso);
            linksJaProcessados.add(concurso.link);
          }
        }
        if (novosConcursosUnicos.length > 0) {
          batch.push(...novosConcursosUnicos);
        }
      }
      if (batch.length >= BATCH_SIZE) {
        console.log(`Enviando lote de ${batch.length} concursos de ${config.sourceName} para o DB...`);
        const { error } = await supabase.from('predicted_openings').upsert(batch, {
          onConflict: 'link'
        });
        if (error) throw new Error(`Falha ao inserir/atualizar lote: ${getErrorMessage(error)}`);
        totalProcessadoNestaFonte += batch.length;
        batch = [];
      }
      pageNum++;
      await new Promise((resolve)=>setTimeout(resolve, REQUEST_DELAY_MS));
    } catch (error) {
      console.error(`Erro no loop da página ${pageNum} de ${config.sourceName}:`, getErrorMessage(error));
      break;
    }
  }
  if (batch.length > 0) {
    console.log(`Enviando lote final de ${batch.length} concursos de ${config.sourceName} para o DB...`);
    const { error } = await supabase.from('predicted_openings').upsert(batch, {
      onConflict: 'link'
    });
    if (error) throw new Error(`Falha ao inserir/atualizar lote final: ${getErrorMessage(error)}`);
    totalProcessadoNestaFonte += batch.length;
  }
  console.log(`Scraping de ${config.sourceName} finalizado. Total de ${totalProcessadoNestaFonte} concursos processados.`);
  return totalProcessadoNestaFonte;
}
// --- Configurações das Fontes ---
const pciPrevistosConfig = {
  sourceName: 'PCI Concursos (Previstos)',
  baseUrl: 'https://www.pciconcursos.com.br',
  getPageUrl: (pageNum: number)=>`https://www.pciconcursos.com.br/previstos/${pageNum > 1 ? `${pageNum}/` : ''}`,
  parseFunction: (doc: Document, baseUrl: string)=>{
    const items = [];
    const dateHeaders = Array.from(doc.querySelectorAll('h2.principal'));
    dateHeaders.forEach((dateHeader: Element)=>{
      try {
        const dateText = dateHeader.textContent?.trim() || '';
        let currentElement = dateHeader.nextElementSibling;
        if (currentElement && currentElement.tagName === 'UL') {
          const listItems = Array.from(currentElement.querySelectorAll('li a'));
          listItems.forEach((linkElement: Element)=>{
            const href = linkElement.getAttribute('href');
            if (!href) return;
            const link = new URL(href, baseUrl).href;
            const title = linkElement.textContent?.trim().replace(/\s+/g, ' ') || 'Título não informado';
            items.push({
              publication_date: normalizarData(dateText),
              title: title,
              link: link,
              source: 'PCI Concursos',
              normalized_title: normalizeText(title),
              mentioned_states: getMentionedStates(title),
            });
          });
        }
      } catch(e) {
          console.error('Error parsing a PCI previstos date section, skipping. Error:', e.message);
      }
    });
    return items;
  }
};
const qconcursosPrevistosConfig = {
  sourceName: 'QConcursos (Previstos)',
  baseUrl: 'https://folha.qconcursos.com',
  getPageUrl: (pageNum: number)=>`https://folha.qconcursos.com/e/concursos-previstos?page=${pageNum}`,
  parseFunction: (doc: Document, baseUrl: string)=>{
    const items = [];
    const articleLinks = doc.querySelectorAll('a[href^="/n/"]');
    // FIX: Changed to a for...of loop with explicit type casting to resolve 'unknown' type errors.
    for (const linkElement of Array.from(articleLinks)) {
      try {
        const href = linkElement.getAttribute('href');
        // FIX: Changed 'return' to 'continue' to avoid exiting the function prematurely.
        if (!href) continue;
        const titleElement = linkElement.querySelector('h2, h3');
        // FIX: Added null check for titleElement to prevent errors.
        if (!titleElement) continue;
        const title = titleElement.textContent?.trim().replace(/\s+/g, ' ') || 'Título não informado';
        
        const dateElement = Array.from(linkElement.querySelectorAll('span')).find(s => s.textContent?.includes('Atualizada em'));
        
        let dateText = null;
        if (dateElement?.textContent) {
          const match = dateElement.textContent.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (match) {
            dateText = match[0];
          }
        }
        
        if (title !== 'Título não informado' && title.toLowerCase() !== 'concursos previstos') {
          items.push({
            publication_date: normalizarData(dateText),
            title: title,
            link: new URL(href, baseUrl).href,
            source: 'QConcursos',
            normalized_title: normalizeText(title),
            mentioned_states: getMentionedStates(title),
          });
        }
      } catch (e) {
        console.error('Error parsing a QConcursos previstos item, skipping. Error:', e.message);
      }
    }
    const uniqueItems = Array.from(new Map(items.map((item)=>[
        item.link,
        item
      ])).values());
    return uniqueItems;
  }
};
// --- Servidor Principal ---
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: CORS_HEADERS
  });
  try {
    console.log("Iniciando scraper incremental de concursos previstos...");
    // As variáveis de ambiente do Supabase são carregadas de forma segura aqui
    const supabaseAdmin = createClient<Database>(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const configs = [
      pciPrevistosConfig,
      qconcursosPrevistosConfig
    ];
    let totalCount = 0;
    const linksJaProcessados = new Set<string>();
    for (const config of configs){
      const count = await scrapeAndInsertInBatches(config, supabaseAdmin, linksJaProcessados);
      totalCount += count;
    }
    console.log(`Processo finalizado. Total de ${totalCount} concursos novos adicionados ou atualizados.`);
    return new Response(JSON.stringify({
      message: `Scraping concluído. ${totalCount} concursos novos foram adicionados ou atualizados.`,
      totalCount: totalCount
    }), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Erro fatal na função principal:", error);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
