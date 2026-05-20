import { ESTADOS_POR_REGIAO, systemDefaultValues, defaultPredictedValues, monthNames } from '../constants';
import { FormattedSearchDetail, PredictedCriteria, SearchCriteria, SummaryData, OpenJobsSortOption, ArticleSortOption } from '../types';

/**
 * Formats a number into a BRL currency string.
 * @param value The number to format.
 * @returns The formatted currency string.
 */
export function formatCurrency(value: number | undefined | null): string {
    if (value === null || value === undefined || value === 0) {
      return 'Não informado';
    }
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
    // Ensure there's a non-breaking space after R$ for consistency
    return formatted.replace(/R\$\s*/, 'R$\u00A0');
}

/**
 * Creates a formatted text message for sharing search results.
 * @param criteria The current search criteria.
 * @param summary The summary data of the search results.
 * @returns A formatted string ready for sharing.
 */
export const createShareMessage = (criteria: SearchCriteria, summary: SummaryData): string => {
    const { totalOpportunities, totalVacancies, highestSalary } = summary;
    const { title: searchTitle, details: searchDetails } = formatSearchCriteria(criteria);

    const hasFilters = JSON.stringify(criteria) !== JSON.stringify(systemDefaultValues);

    let message: string;

    if (hasFilters) {
        message = `📄 Resumo da busca de concursos: ${searchTitle}\n\n`;
        message += `▫️ Oportunidades: ${totalOpportunities.toLocaleString('pt-BR')}\n`;
        message += `▫️ Total de Vagas: ${totalVacancies.toLocaleString('pt-BR')}\n`;
        if (highestSalary > 0) {
            message += `▫️ Maior Salário: ${formatCurrency(highestSalary)}\n`;
        }
        if (searchDetails.length > 0) {
            message += `▫️ Filtros: ${searchDetails.map(d => d.text).join(', ')}\n`;
        }
    } else { // No filters (general search)
        message = `📄 Resumo de concursos em todo o Brasil:\n\n`;
        message += `▫️ Oportunidades: ${totalOpportunities.toLocaleString('pt-BR')}\n`;
        message += `▫️ Total de Vagas: ${totalVacancies.toLocaleString('pt-BR')}\n`;
        if (highestSalary > 0) {
            message += `▫️ Maior Salário: ${formatCurrency(highestSalary)}\n`;
        }
    }

    message += `\nVeja mais em: ${window.location.origin}`;

    return message;
};

/**
 * Formats a search criteria object into a human-readable title and list of details.
 * @param criteria The search criteria object.
 * @returns An object with a `title` string and an array of `details`.
 */
export function formatSearchCriteria(criteria: Partial<SearchCriteria>): { title: string; details: FormattedSearchDetail[] } {
    const openJobsSortOptions: { value: OpenJobsSortOption; label: string }[] = [
        { value: 'alpha-asc', label: 'Órgão (A-Z)' },
        { value: 'alpha-desc', label: 'Órgão (Z-A)' },
        { value: 'deadline-asc', label: 'Prazo (Mais próximo)' },
        { value: 'deadline-desc', label: 'Prazo (Mais distante)' },
        { value: 'salary-desc', label: 'Maior Salário' },
        { value: 'salary-asc', label: 'Menor Salário' },
        { value: 'vacancies-desc', label: 'Mais Vagas' },
        { value: 'vacancies-asc', label: 'Menos Vagas' },
        { value: 'distance-asc', label: 'Mais Perto' },
        { value: 'distance-desc', label: 'Mais Longe' },
    ];
    const allStates = Object.values(ESTADOS_POR_REGIAO).flat();
    const fullCriteria = { ...systemDefaultValues, ...criteria };

    let title: string;
    
    if (criteria.name) {
        title = criteria.name;
    } else {
        let location = 'Em todo o Brasil';
        if (fullCriteria.estado === 'brasil' || !fullCriteria.estado) {
            location = 'Em todo o Brasil';
        } else if (fullCriteria.estado === 'nacional') {
            location = 'Âmbito nacional';
        } else if (fullCriteria.estado.startsWith('regiao-')) {
            const regionKeyRaw = fullCriteria.estado.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            location = `Região ${regionKey}`;
        } else {
            const stateName = allStates.find(s => s.sigla === fullCriteria.estado.toUpperCase())?.nome;
            if (fullCriteria.cidadeFiltro) {
                location = `${fullCriteria.cidadeFiltro.trim()}, ${fullCriteria.estado.toUpperCase()}`;
            } else {
                location = `${stateName}`;
            }
        }
        title = location;
    }

    const details: FormattedSearchDetail[] = [];
    const isStateSelected = fullCriteria.estado.length === 2;

    if (fullCriteria.estado !== 'brasil') {
        let name = fullCriteria.estado.toUpperCase();
        if (fullCriteria.estado.startsWith('regiao-')) {
            const regionKeyRaw = fullCriteria.estado.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            name = `Região ${regionKey}`;
        } else if (fullCriteria.estado !== 'nacional') {
            name = allStates.find(s => s.sigla === fullCriteria.estado.toUpperCase())?.nome || name;
        } else {
            name = 'Nacional';
        }
        details.push({ type: 'keyword', text: name, key: 'estado' });
    }
    if (fullCriteria.cidadeFiltro && isStateSelected) {
        details.push({ type: 'keyword', text: fullCriteria.cidadeFiltro, key: 'cidadeFiltro' });
    }
    if (fullCriteria.cargo) {
        details.push({ type: 'role', text: `Cargo: "${fullCriteria.cargo.trim()}"`, key: 'cargo' });
    }
    if (fullCriteria.palavraChave) {
        details.push({ type: 'keyword', text: `Termo: "${fullCriteria.palavraChave.trim()}"`, key: 'palavraChave' });
    }
    if (fullCriteria.distanciaRaio && fullCriteria.distanciaRaio > 0 && fullCriteria.cidadeFiltro && isStateSelected) {
        details.push({ type: 'distance', text: `Raio de ${fullCriteria.distanciaRaio} km`, key: 'distanciaRaio' });
    }
    if (fullCriteria.incluirVizinhos && isStateSelected) {
        details.push({ type: 'neighbors', text: 'Incluindo estados vizinhos', key: 'incluirVizinhos' });
    }
    if (fullCriteria.escolaridade && fullCriteria.escolaridade.length > 0) {
        fullCriteria.escolaridade.forEach(level => {
            details.push({ type: 'education', text: level.replace('Nível ', ''), key: 'escolaridade', value: level });
        });
    }
    if (fullCriteria.salarioMinimo && fullCriteria.salarioMinimo > 0) {
        details.push({ type: 'salary', text: `Salário > ${formatCurrency(fullCriteria.salarioMinimo)}`, key: 'salarioMinimo' });
    }
    if (fullCriteria.vagasMinimas && fullCriteria.vagasMinimas > 0) {
        details.push({ type: 'vacancies', text: `Vagas > ${fullCriteria.vagasMinimas}`, key: 'vagasMinimas' });
    }
    if (fullCriteria.sort && fullCriteria.sort !== systemDefaultValues.sort) {
        const sortLabel = openJobsSortOptions.find(o => o.value === fullCriteria.sort)?.label || fullCriteria.sort;
        details.push({ type: 'keyword', text: `Ordem: ${sortLabel}`, key: 'sort' });
    }

    return { title, details };
}

/**
 * Formats a predicted criteria object into a human-readable title and list of details.
 * @param criteria The predicted criteria object.
 * @returns An object with a `title` string and an array of `details`.
 */
export function formatPredictedCriteria(criteria: Partial<PredictedCriteria>): { title: string; details: FormattedSearchDetail[] } {
    const articleSortOptions: { value: ArticleSortOption; label: string }[] = [
        { value: 'date-desc', label: 'Mais Recentes' },
        { value: 'date-asc', label: 'Mais Antigos' },
    ];
    const allStates = Object.values(ESTADOS_POR_REGIAO).flat();
    const fullCriteria = { ...defaultPredictedValues, ...criteria };

    let title: string;

    if (criteria.name) {
        title = criteria.name;
    } else {
        let location = 'Em todo o Brasil';
        if (fullCriteria.location === 'brasil' || !fullCriteria.location) {
            location = 'Em todo o Brasil';
        } else if (fullCriteria.location.startsWith('regiao-')) {
            const regionKeyRaw = fullCriteria.location.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            location = `Região ${regionKey}`;
        } else {
            const stateName = allStates.find(s => s.sigla === fullCriteria.location.toUpperCase())?.nome;
            location = stateName || fullCriteria.location;
        }
        title = fullCriteria.searchTerm ? `"${fullCriteria.searchTerm.trim()}" em ${location}` : location;
    }
    
    const details: FormattedSearchDetail[] = [];

    if (fullCriteria.location !== 'brasil') {
        let name = fullCriteria.location.toUpperCase();
        if (fullCriteria.location.startsWith('regiao-')) {
            const regionKeyRaw = fullCriteria.location.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            name = `Região ${regionKey}`;
        } else {
            name = allStates.find(s => s.sigla === fullCriteria.location.toUpperCase())?.nome || name;
        }
        details.push({ type: 'keyword', text: name, key: 'location' });
    }
    if (fullCriteria.searchTerm) {
        details.push({ type: 'keyword', text: `Termo: "${fullCriteria.searchTerm.trim()}"`, key: 'searchTerm' });
    }
    if (fullCriteria.month !== 'todos') {
        details.push({ type: 'date', text: monthNames[parseInt(fullCriteria.month, 10) - 1], key: 'month' });
    }
    if (fullCriteria.year !== 'todos') {
        details.push({ type: 'date', text: fullCriteria.year, key: 'year' });
    }
    if (fullCriteria.sources && fullCriteria.sources.length > 0) {
        details.push({ type: 'source', text: `${fullCriteria.sources.length} fonte(s)`, key: 'sources' });
    }
    if (fullCriteria.sort && fullCriteria.sort !== defaultPredictedValues.sort) {
        const sortLabel = articleSortOptions.find(o => o.value === fullCriteria.sort)?.label || fullCriteria.sort;
        details.push({ type: 'date', text: `Ordem: ${sortLabel}`, key: 'sort' });
    }

    return { title, details };
}