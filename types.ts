import type React from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type { Session, User };

// FIX: Export the 'Json' type to be used in other files for Supabase data operations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Theme = 'light' | 'dark' | 'auto';

export interface IconProps {
  className?: string;
}

export interface NavItem {
    id: ActiveTab;
    label: string;
    icon: React.ReactElement<IconProps>;
}

export interface Job {
  titulo: string;
  orgao: string;
  localidade: string;
  salario: string;
  escolaridade: string;
  link: string;
  cidade?: string;
  cidadeEfetiva?: string | null;
  logoPath?: string;
  prazoInscricao?: string;
  fonte?: string;
}

export interface ProcessedJob extends Job {
  normalizedCidadeEfetiva: string;
  maxSalaryNum: number;
  minSalaryNum: number;
  vacanciesNum: number;
  educationLevels: string[];
  parsedSalary: string | null;
  parsedVacancies: string | null;
  parsedRoles: string[];
  mentionedStates?: string[];
  lat?: number;
  lon?: number;
  distance?: number;
  type: 'concurso' | 'processo_seletivo';
  prazoInscricaoFormatado?: string | null;
  prazoInscricaoData?: string | null;
}

export interface PredictedJob {
  date: string;
  title: string;
  link: string;
  source?: string;
}

export interface ProcessedPredictedJob extends PredictedJob {
  dateObject: Date;
  mentionedStates: string[];
}

// Interface base para itens que podem ser favoritados e nomeados
export interface SavedItem {
  name?: string;
}

export interface SearchCriteria extends SavedItem {
  estado: string;
  cidadeFiltro: string;
  escolaridade: string[];
  salarioMinimo: number | '';
  vagasMinimas: number | '';
  palavraChave: string;
  cargo: string;
  incluirVizinhos: boolean;
  distanciaRaio: number | '';
  sort: OpenJobsSortOption;
}

export interface PredictedCriteria extends SavedItem {
  searchTerm: string;
  location: string;
  month: string;
  year: string;
  sources: string[];
  sort: ArticleSortOption;
}

export interface City {
  name: string;
  normalizedName: string;
  lat: number;
  lon: number;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largerText: boolean;
  reduceMotion: boolean;
  uiScale: number;
  openLinksInModal: boolean;
  showQuickAccess: boolean;
  dyslexicFont: boolean;
  highlightLinks: boolean;
  textSpacing: boolean;
  grayscale: boolean;
}

export interface SummaryData {
    totalOpportunities: number;
    totalVacancies: number;
    highestSalary: number;
}

export interface FormattedSearchDetail {
    type: 'salary' | 'education' | 'vacancies' | 'distance' | 'keyword' | 'neighbors' | 'date' | 'source' | 'role';
    text: string;
    key: string;
    value?: any;
}

export interface Estado {
  sigla: string;
  nome: string;
  capital: string;
}

export interface EstadosPorRegiao {
  [key: string]: Estado[];
}

export interface VIZINHANCAS_ESTADOS {
    [key: string]: string[];
}

export type AuthView = 'login' | 'signup' | 'forgot_password';
export type ActiveTab = 'search' | 'predicted' | 'news' | 'settings' | 'support' | 'auth' | 'rss';
export type OverviewDashboardTab = 'summary' | 'open' | 'predicted' | 'news';
export type SettingsSectionId = 'appearance' | 'accessibility' | 'data' | 'account';


export type OpenJobsSortOption = 
    | 'alpha-asc' 
    | 'alpha-desc' 
    | 'deadline-asc' 
    | 'deadline-desc' 
    | 'salary-desc' 
    | 'salary-asc' 
    | 'vacancies-desc' 
    | 'vacancies-asc'
    | 'distance-asc'
    | 'distance-desc';

export type ArticleSortOption = 'date-desc' | 'date-asc';