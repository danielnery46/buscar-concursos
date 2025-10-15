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
