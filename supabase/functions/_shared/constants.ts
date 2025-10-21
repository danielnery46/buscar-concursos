// This file is a simplified version of the main `constants.ts` for use within Supabase Edge Functions.

export const ESTADOS_POR_REGIAO = {
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