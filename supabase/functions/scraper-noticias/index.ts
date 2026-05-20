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

// --- Configurações Finais de Produção ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const MAX_PAGES_PER_SOURCE = 5;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const REQUEST_DELAY_MS = 250;
const CONSECUTIVE_EMPTY_THRESHOLD = 5;
const BATCH_SIZE = 100;

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
// --- Lógica de Scraping Principal ---
async function scrapeAndInsertInBatches(config: any, supabase: any, linksJaProcessados: Set<string>) {
  let batch = [];
  let totalProcessadoNestaFonte = 0;
  let pageNum = 1;
  let consecutiveEmptyPages = 0;
  console.log(`--- Iniciando scraping para: ${config.sourceName} ---`);
  while(pageNum <= MAX_PAGES_PER_SOURCE){
    try {
      const url = config.getPageUrl(pageNum);
      const htmlText = await retryAsync(async ()=>{
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status: ${response.status} na página ${pageNum}`);
        return await response.text();
      }, MAX_RETRIES, INITIAL_RETRY_DELAY_MS);
      let pageNews = [];
      try {
        const doc = new DOMParser().parseFromString(htmlText, "text/html");
        if (!doc) throw new Error("Parser retornou documento nulo.");
        pageNews = config.parseFunction(doc, config.baseUrl);
      } catch (parseError) {
        console.error(`!! ERRO DE PARSING na página ${pageNum} de ${config.sourceName}. Pulando página. Erro: ${getErrorMessage(parseError)}`);
        pageNum++;
        continue;
      }
      if (pageNews.length === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= CONSECUTIVE_EMPTY_THRESHOLD) {
          console.log(`Parando ${config.sourceName} após ${CONSECUTIVE_EMPTY_THRESHOLD} páginas vazias.`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
        const noticiasUnicasNovas = [];
        for (const noticia of pageNews){
          if (!linksJaProcessados.has(noticia.link)) {
            noticiasUnicasNovas.push(noticia);
            linksJaProcessados.add(noticia.link);
          }
        }
        if(noticiasUnicasNovas.length > 0) {
          batch.push(...noticiasUnicasNovas);
        }
      }
      if (batch.length >= BATCH_SIZE) {
        console.log(`Enviando lote de ${batch.length} notícias de ${config.sourceName} para o DB...`);
        const { error } = await supabase.from('news_articles').upsert(batch, {
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
    console.log(`Enviando lote final de ${batch.length} notícias de ${config.sourceName} para o DB...`);
    const { error } = await supabase.from('news_articles').upsert(batch, {
      onConflict: 'link'
    });
    if (error) throw new Error(`Falha ao inserir/atualizar lote final: ${getErrorMessage(error)}`);
    totalProcessadoNestaFonte += batch.length;
  }
  console.log(`Scraping de ${config.sourceName} finalizado. Total de ${totalProcessadoNestaFonte} notícias processadas.`);
  return totalProcessadoNestaFonte;
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

// --- Configurações das Fontes ---
const pciConfig = {
  sourceName: 'PCI Concursos',
  baseUrl: 'https://www.pciconcursos.com.br',
  getPageUrl: (pageNum: number)=>`https://www.pciconcursos.com.br/noticias/${pageNum > 1 ? `${pageNum}/` : ''}`,
  parseFunction: (doc: Document, baseUrl: string)=>{
    const items = [];
    const dateHeaders = Array.from(doc.querySelectorAll('h2.principal'));
    dateHeaders.forEach((dateHeader: Element)=>{
      try {
        const date = dateHeader.textContent?.trim();
        if (!date || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return;
        let currentElement = dateHeader.nextElementSibling;
        if (currentElement && currentElement.tagName === 'UL') {
          const listItems = Array.from(currentElement.querySelectorAll('li a'));
          listItems.forEach((linkElement: Element)=>{
            const href = linkElement.getAttribute('href');
            if (!href) return;
            const link = new URL(href, baseUrl).href;
            const title = linkElement.textContent?.trim().replace(/\s+/g, ' ') || 'Título не informado';
            items.push({
              publication_date: normalizarData(date),
              title: title,
              link: link,
              source: 'PCI Concursos',
              normalized_title: normalizeText(title),
              mentioned_states: getMentionedStates(title),
            });
          });
        }
      } catch (e) {
        console.error('Error parsing a PCI news date section, skipping. Error:', e.message);
      }
    });
    return items;
  }
};
const qconcursosConfig = {
  sourceName: 'QConcursos',
  baseUrl: 'https://folha.qconcursos.com',
  getPageUrl: (pageNum: number)=>`https://folha.qconcursos.com/noticias-de-concursos${pageNum > 1 ? `?page=${pageNum}` : ''}`,
  parseFunction: (doc: Document, baseUrl: string)=>{
    const items = [];
    const articleLinks = Array.from(doc.querySelectorAll('main a[href^="/n/"]'));
    for (const linkElement of articleLinks as Element[]){
      try {
        const href = linkElement.getAttribute('href');
        const titleElement = linkElement.querySelector('h2, h3');
        if (!href || !titleElement) continue;

        const link = `${baseUrl}${href}`;
        // FIX: Explicitly cast to Element to resolve 'unknown' type error.
        const title = (titleElement as Element).textContent?.trim() || 'Título не informado';
        
        // FIX: Explicitly cast to Element[] to resolve 'unknown' type errors for `s` and `dateElement`.
        const dateElement = (Array.from(linkElement.querySelectorAll('span')) as Element[]).find(s => s.textContent?.includes('Atualizada em'));
        
        let dateText = null;
        if (dateElement?.textContent) {
          const match = dateElement.textContent.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (match) {
            dateText = match[0];
          }
        }
        
        items.push({
          publication_date: normalizarData(dateText),
          title: title,
          link: link,
          source: 'QConcursos',
          normalized_title: normalizeText(title),
          mentioned_states: getMentionedStates(title),
        });
      } catch(e) {
          console.error('Error parsing a QConcursos news item, skipping. Error:', e.message);
      }
    }
    const uniqueItems = Array.from(new Map(items.map((item)=>[item.link, item])).values());
    return uniqueItems;
  }
};
const jcconcursosConfig = {
  sourceName: 'JC Concursos',
  baseUrl: 'https://jcconcursos.com.br',
  getPageUrl: (pageNum: number)=>`https://jcconcursos.com.br/noticia?page=${pageNum}`,
  parseFunction: (doc: Document, baseUrl: string)=>{
    const items = [];
    const articleElements = doc.querySelectorAll('div.artigo_listing');
    // FIX: Switched to a for...of loop with explicit type casting.
    // This is a more robust way to iterate over NodeListOf results in Deno/TS environments,
    // preventing the loop variable from being inferred as `unknown` and causing type errors on property access.
    for (const element of articleElements as any as Element[]) {
      try {
        const linkElement = element.querySelector('a');
        const titleElement = element.querySelector('h2.h4');
        const dateElement = element.querySelector('span.autor-data-list');
        // Using `continue` to skip to the next iteration in a for...of loop.
        if (!linkElement || !titleElement || !dateElement) continue;
        const href = linkElement.getAttribute('href');
        if (!href) continue;
        const link = new URL(href, baseUrl).href;
        const title = (titleElement as Element).textContent?.trim();
        const dateText = (dateElement as Element).textContent;

        if (!title) continue;

        items.push({
          publication_date: normalizarData(dateText),
          title: title,
          link: link,
          source: 'JC Concursos',
          normalized_title: normalizeText(title),
          mentioned_states: getMentionedStates(title),
        });
      } catch(e) {
        console.error('Error parsing a JC Concursos news item, skipping. Error:', e.message);
      }
    }
    return items;
  }
};

// --- Servidor Principal ---
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: CORS_HEADERS
  });
  try {
    console.log("Iniciando scraping incremental de notícias...");
    const supabaseAdmin = createClient<Database>(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Busca todos os links existentes para evitar reprocessamento
    const { data: existingLinksData, error: fetchError } = await supabaseAdmin
        .from('news_articles')
        .select('link');

    if (fetchError) {
        throw new Error(`Falha ao buscar links existentes: ${getErrorMessage(fetchError)}`);
    }

    const linksJaProcessados: Set<string> = new Set(existingLinksData.map((item: any) => item.link));
    console.log(`Encontrados ${linksJaProcessados.size} links de notícias existentes no banco de dados.`);

    const configs = [
      pciConfig,
      qconcursosConfig,
      jcconcursosConfig,
    ];
    let totalCount = 0;
    
    for (const config of configs){
      const count = await scrapeAndInsertInBatches(config, supabaseAdmin, linksJaProcessados);
      totalCount += count;
    }

    console.log(`Processo finalizado. Total de ${totalCount} notícias novas adicionadas ou atualizadas.`);
    return new Response(JSON.stringify({
      message: `Scraping concluído. ${totalCount} notícias novas foram adicionadas ou atualizadas.`,
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