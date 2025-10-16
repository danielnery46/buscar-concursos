import type { ProcessedJob, OpenJobsSortOption } from '../types';

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