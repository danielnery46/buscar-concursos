/**
 * Normalizes text by converting to lowercase and removing diacritics.
 * @param text The string to normalize.
 * @returns The normalized string.
 */
export const normalizeText = (text: string | null | undefined): string =>
    text ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : "";
