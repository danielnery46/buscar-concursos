import { EstadosPorRegiao, SearchCriteria, PredictedCriteria } from './types';

export const NIVEIS_ESCOLARIDADE: string[] = [
    'Qualquer',
    'Nível Fundamental',
    'Nível Médio',
    'Nível Técnico',
    'Nível Superior'
];

export const ESTADOS_POR_REGIAO: EstadosPorRegiao = {
    'Sudeste': [
      { sigla: 'ES', nome: 'Espírito Santo', capital: 'Vitória' },
      { sigla: 'MG', nome: 'Minas Gerais', capital: 'Belo Horizonte' },
      { sigla: 'RJ', nome: 'Rio de Janeiro', capital: 'Rio de Janeiro' },
      { sigla: 'SP', nome: 'São Paulo', capital: 'São Paulo' },
    ],
    'Sul': [
      { sigla: 'PR', nome: 'Paraná', capital: 'Curitiba' },
      { sigla: 'RS', nome: 'Rio Grande do Sul', capital: 'Porto Alegre' },
      { sigla: 'SC', nome: 'Santa Catarina', capital: 'Florianópolis' },
    ],
    'Centro-Oeste': [
      { sigla: 'DF', nome: 'Distrito Federal', capital: 'Brasília' },
      { sigla: 'GO', nome: 'Goiás', capital: 'Goiânia' },
      { sigla: 'MT', nome: 'Mato Grosso', capital: 'Cuiabá' },
      { sigla: 'MS', nome: 'Mato Grosso do Sul', capital: 'Campo Grande' },
    ],
    'Nordeste': [
      { sigla: 'AL', nome: 'Alagoas', capital: 'Maceió' },
      { sigla: 'BA', nome: 'Bahia', capital: 'Salvador' },
      { sigla: 'CE', nome: 'Ceará', capital: 'Fortaleza' },
      { sigla: 'MA', nome: 'Maranhão', capital: 'São Luís' },
      { sigla: 'PB', nome: 'Paraíba', capital: 'João Pessoa' },
      { sigla: 'PE', nome: 'Pernambuco', capital: 'Recife' },
      { sigla: 'PI', nome: 'Piauí', capital: 'Teresina' },
      { sigla: 'RN', nome: 'Rio Grande do Norte', capital: 'Natal' },
      { sigla: 'SE', nome: 'Sergipe', capital: 'Aracaju' },
    ],
    'Norte': [
      { sigla: 'AC', nome: 'Acre', capital: 'Rio Branco' },
      { sigla: 'AP', nome: 'Amapá', capital: 'Macapá' },
      { sigla: 'AM', nome: 'Amazonas', capital: 'Manaus' },
      { sigla: 'PA', nome: 'Pará', capital: 'Belém' },
      { sigla: 'RO', nome: 'Rondônia', capital: 'Porto Velho' },
      { sigla: 'RR', nome: 'Roraima', capital: 'Boa Vista' },
      { sigla: 'TO', nome: 'Tocantins', capital: 'Palmas' },
    ],
};

export const VIZINHANCAS_ESTADOS: { [key: string]: string[] } = {
    'AC': ['AM', 'RO'],
    'AL': ['SE', 'PE', 'BA'],
    'AP': ['PA'],
    'AM': ['RR', 'PA', 'MT', 'RO', 'AC'],
    'BA': ['SE', 'AL', 'PE', 'PI', 'TO', 'GO', 'MG', 'ES'],
    'CE': ['RN', 'PB', 'PE', 'PI'],
    'DF': ['GO'],
    'ES': ['BA', 'MG', 'RJ'],
    'GO': ['MT', 'TO', 'BA', 'MG', 'MS', 'DF'],
    'MA': ['PI', 'TO', 'PA'],
    'MT': ['AM', 'PA', 'TO', 'GO', 'MS', 'RO'],
    'MS': ['MT', 'GO', 'MG', 'SP', 'PR'],
    'MG': ['BA', 'ES', 'RJ', 'SP', 'MS', 'GO'],
    'PA': ['AP', 'RR', 'AM', 'MT', 'TO', 'MA'],
    'PB': ['RN', 'CE', 'PE'],
    'PR': ['SP', 'MS', 'SC'],
    'PE': ['PB', 'CE', 'PI', 'BA', 'AL'],
    'PI': ['MA', 'CE', 'PE', 'BA', 'TO'],
    'RJ': ['ES', 'MG', 'SP'],
    'RN': ['CE', 'PB'],
    'RS': ['SC'],
    'RO': ['AC', 'AM', 'MT'],
    'RR': ['AM', 'PA'],
    'SC': ['PR', 'RS'],
    'SP': ['RJ', 'MG', 'MS', 'PR'],
    'SE': ['AL', 'BA'],
    'TO': ['PA', 'MA', 'PI', 'BA', 'GO', 'MT']
};

export const DEFAULT_SEARCH_KEY = 'buscarConcursosDefaultSearch_v2';
export const DEFAULT_PREDICTED_FILTER_KEY = 'buscarConcursosDefaultPredictedFilter_v1';
export const DEFAULT_NEWS_FILTER_KEY = 'buscarConcursosDefaultNewsFilter_v1';
export const ROTA_CIDADE_KEY = 'buscarConcursosRotaCidade';
export const FAVORITE_SEARCHES_KEY = 'buscarConcursosFavoriteSearches_v2';
export const FAVORITE_PREDICTED_FILTERS_KEY = 'buscarConcursosFavoritePredictedFilters_v1';
export const FAVORITE_NEWS_FILTERS_KEY = 'buscarConcursosFavoriteNewsFilters_v1';
export const ACCESSIBILITY_SETTINGS_KEY = 'buscarConcursosAccessibilitySettings';
export const TUTORIAL_KEY = 'buscarConcursosTutorialCompleted_v2';
export const THEME_KEY = 'theme';

export const systemDefaultValues: Omit<SearchCriteria, 'name'> = {
    estado: 'brasil',
    cidadeFiltro: '',
    escolaridade: [] as string[],
    salarioMinimo: '' as const,
    vagasMinimas: '' as const,
    palavraChave: '',
    incluirVizinhos: false,
    distanciaRaio: '' as const,
    sort: 'alpha-asc',
};

export const defaultPredictedValues: Omit<PredictedCriteria, 'name'> = {
    searchTerm: '',
    location: 'brasil',
    month: 'todos',
    year: 'todos',
    sources: [] as string[],
    sort: 'date-desc',
};

export const currentYear = new Date().getFullYear();
export const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);
export const months = Array.from({ length: 12 }, (_, i) => i + 1);
export const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];