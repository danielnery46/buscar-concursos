import type { ProcessedJob, OpenJobsSortOption, JobInterestMap } from '../types';

/**
 * Combina nomes de classe condicionalmente. Alternativa leve ao 'clsx'.
 * @param {...(string | boolean | null | undefined)[]} classes - As classes a serem combinadas.
 * @returns {string} A string de classes combinada.
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

/**
 * Copies a string to the user's clipboard, supporting both modern and legacy APIs.
 * @param text The text to copy.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error('Não foi possível copiar o texto:', err);
      return false;
    }
}

/**
 * Pre-fetches a URL to potentially speed up navigation.
 * @param url The URL to prefetch.
 */
export function prefetchUrl(url: string) {
    // Check if a prefetch link for this URL already exists to avoid duplicates
    if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
        return;
    }
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
    // Let the browser manage the lifecycle of the prefetch link.
    // Removing it prematurely might cancel the prefetch.
}

/**
 * Sorts an array of job objects based on a specified sort option.
 * @param jobs The array of jobs to sort.
 * @param sort The sorting option.
 * @returns A new array with the sorted jobs.
 */
export function sortJobs(jobs: ProcessedJob[], sort: OpenJobsSortOption): ProcessedJob[] {
    const sortedJobs = [...jobs];

    sortedJobs.sort((a, b) => {
        switch (sort) {
            case 'alpha-asc':
                return a.orgao.localeCompare(b.orgao);
            case 'alpha-desc':
                return b.orgao.localeCompare(a.orgao);
            case 'deadline-asc':
                if (!a.prazoInscricaoData) return 1;
                if (!b.prazoInscricaoData) return -1;
                return new Date(a.prazoInscricaoData).getTime() - new Date(b.prazoInscricaoData).getTime();
            case 'deadline-desc':
                if (!a.prazoInscricaoData) return 1;
                if (!b.prazoInscricaoData) return -1;
                return new Date(b.prazoInscricaoData).getTime() - new Date(a.prazoInscricaoData).getTime();
            case 'salary-desc':
                return (b.maxSalaryNum || 0) - (a.maxSalaryNum || 0);
            case 'salary-asc':
                const salA = a.maxSalaryNum || Number.POSITIVE_INFINITY;
                const salB = b.maxSalaryNum || Number.POSITIVE_INFINITY;
                if (salA === salB) return 0;
                return salA - salB;
            case 'vacancies-desc':
                return (b.vacanciesNum || 0) - (a.vacanciesNum || 0);
            case 'vacancies-asc':
                return (a.vacanciesNum || 0) - (b.vacanciesNum || 0);
            case 'distance-asc':
                if (a.distance === undefined || a.distance === null) return 1;
                if (b.distance === undefined || b.distance === null) return -1;
                return a.distance - b.distance;
            case 'distance-desc':
                if (a.distance === undefined || a.distance === null) return 1;
                if (b.distance === undefined || b.distance === null) return -1;
                return b.distance - a.distance;
            default:
                return 0;
        }
    });

    return sortedJobs;
}

/**
 * Agrupa e ordena uma lista COMPLETA de vagas (já carregada em memória — ex: o conjunto
 * de uma busca por proximidade) de acordo com a marcação de interesse do usuário,
 * aplicando a ordenação escolhida (`sort`) DENTRO de cada grupo:
 *
 *   1) "Tenho interesse"     — ordenadas conforme `sort`
 *   2) Ainda não avaliadas   — ordenadas conforme `sort`
 *   3) "Não tenho interesse" — ordenadas conforme `sort`
 *
 * Assim, não importa o critério de ordenação escolhido (órgão A-Z, prazo, salário, etc.),
 * o usuário sempre vê primeiro o que marcou como interessante (já na ordem pedida), depois
 * o que ainda não avaliou, e por fim o que marcou como sem interesse — sempre sabendo, pela
 * posição do card, o que já analisou e o que falta ver.
 *
 * Use esta função quando o conjunto completo já estiver disponível no cliente (ex: busca
 * por proximidade). Para buscas paginadas no servidor, veja `fetchJobsGroupedByInterest`,
 * que aplica esta mesma lógica de agrupamento de forma global e eficiente no banco de dados.
 *
 * @param jobs O conjunto completo de vagas a agrupar.
 * @param interestMap Mapa `link -> status de interesse` do usuário.
 * @param sort O critério de ordenação atualmente selecionado.
 * @returns Uma nova lista com "interessantes" no topo, "sem interesse" no final, e cada
 * grupo internamente ordenado conforme `sort`.
 */
export function groupAndSortByInterest(jobs: ProcessedJob[], interestMap: JobInterestMap, sort: OpenJobsSortOption): ProcessedJob[] {
    if (!jobs.length || !Object.keys(interestMap).length) return sortJobs(jobs, sort);

    const interested: ProcessedJob[] = [];
    const unmarked: ProcessedJob[] = [];
    const notInterested: ProcessedJob[] = [];

    for (const job of jobs) {
        const status = interestMap[job.link];
        if (status === 'interested') interested.push(job);
        else if (status === 'not_interested') notInterested.push(job);
        else unmarked.push(job);
    }

    return [
        ...sortJobs(interested, sort),
        ...sortJobs(unmarked, sort),
        ...sortJobs(notInterested, sort),
    ];
}


/**
 * Retries an async operation with exponential backoff.
 * @param operation The async function to execute.
 * @param maxRetries The maximum number of retries.
 * @param delayMs The initial delay in milliseconds.
 * @returns A promise that resolves with the result of the operation.
 */
export async function retryAsync<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number
): Promise<T> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            // Do not retry if the request was aborted by the user
            if (error?.name === 'AbortError' || error?.message?.includes('The operation was aborted')) {
                throw error;
            }
            console.warn(`Attempt ${attempt} of ${maxRetries} failed: ${error?.message || 'Unknown error'}`);
            if (attempt < maxRetries) {
                const delay = delayMs * Math.pow(2, attempt - 1);
                console.log(`Waiting ${delay / 1000}s before retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}