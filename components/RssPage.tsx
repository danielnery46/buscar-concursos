import React, { useState, memo, useMemo, useEffect, useCallback } from 'react';
import { RssIcon, CheckIcon, CopyIcon, FilterIcon, ChevronDownIcon } from './Icons';
import { supabaseUrl } from '../utils/supabase';
import { copyToClipboard } from '../utils/helpers';
import { Tabs } from './ui/Tabs';
import { SearchCriteria, PredictedCriteria, City } from '../types';
import { systemDefaultValues, defaultPredictedValues, VIZINHANCAS_ESTADOS } from '../constants';
import { SearchFormContent, PredictedNewsFormContent } from './FormContents';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

// Type for the active tab in the custom feed creator
type RssTab = 'abertos' | 'previstos' | 'noticias';

interface RssPageProps {
    cityDataCache: Record<string, City[]>;
    loadCitiesForState: (state: string) => Promise<Record<string, City[]>>;
}

// A simple, reusable component for displaying a single feed's info and actions.
const FeedDisplay: React.FC<{ title: string; description: string; feedUrl: string }> = ({ title, description, feedUrl }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        const success = await copyToClipboard(feedUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    }, [feedUrl]);

    return (
        <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4 h-10">{description}</p>
            <div className="space-y-3">
                <Input
                    readOnly
                    value={feedUrl}
                    icon={<RssIcon className="h-5 w-5 text-orange-500" />}
                    className="text-xs"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    aria-label={`URL do Feed para ${title}`}
                />
                <Button onClick={handleCopy} disabled={copied} variant="secondary" className="w-full">
                    {copied ? <CheckIcon className="h-5 w-5 text-emerald-500" /> : <CopyIcon className="h-5 w-5" />}
                    <span className="ml-2">{copied ? 'Copiado!' : 'Copiar Link'}</span>
                </Button>
            </div>
        </div>
    );
};

// Helper to build the query string for custom feeds
function buildQueryString(criteria: Partial<SearchCriteria | PredictedCriteria>, defaultCriteria: any): string {
    const params = new URLSearchParams();
    for (const key in criteria) {
        if (Object.prototype.hasOwnProperty.call(criteria, key)) {
            const value = criteria[key as keyof typeof criteria];
            const defaultValue = defaultCriteria[key];

            // Only add params that are different from the default
            if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        params.append(key, value.join(','));
                    }
                } else if (value !== '' && value !== null && value !== undefined) {
                    params.append(key, String(value));
                }
            }
        }
    }
    return params.toString();
}

const RssPage: React.FC<RssPageProps> = memo(({ cityDataCache, loadCitiesForState }) => {
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    // State for the custom feed creator
    const [activeTab, setActiveTab] = useState<RssTab>('abertos');
    const [openJobsCriteria, setOpenJobsCriteria] = useState<SearchCriteria>(systemDefaultValues);
    const [predictedCriteria, setPredictedCriteria] = useState<PredictedCriteria>(defaultPredictedValues);
    const [newsCriteria, setNewsCriteria] = useState<PredictedCriteria>(defaultPredictedValues);
    
    // State for the generated URL and copy feedback
    const [generatedFeedUrl, setGeneratedFeedUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const [isCityDataLoading, setIsCityDataLoading] = useState(false);

    // List of general, non-filtered feeds
    const generalFeeds = [
        { title: 'Vagas Abertas', description: 'Receba todas as novas vagas de concursos e processos seletivos.', feedUrl: `${supabaseUrl}/functions/v1/rss-abertos` },
        { title: 'Concursos Previstos', description: 'Acompanhe os anúncios de concursos que estão por vir.', feedUrl: `${supabaseUrl}/functions/v1/rss-previstos` },
        { title: 'Notícias', description: 'Fique por dentro das últimas novidades do mundo dos concursos.', feedUrl: `${supabaseUrl}/functions/v1/rss-noticias` }
    ];

    // Effect to update the generated URL whenever filters change
    useEffect(() => {
        let baseUrl = '';
        let queryString = '';

        if (activeTab === 'abertos') {
            baseUrl = `${supabaseUrl}/functions/v1/rss-abertos`;
            // Cria uma cópia dos critérios, excluindo 'escolaridade' pois não é suportado nesta UI
            const { escolaridade, ...rssCriteria } = openJobsCriteria;
            queryString = buildQueryString(rssCriteria, systemDefaultValues);
        } else if (activeTab === 'previstos') {
            baseUrl = `${supabaseUrl}/functions/v1/rss-previstos`;
            queryString = buildQueryString(predictedCriteria, defaultPredictedValues);
        } else { // noticias
            baseUrl = `${supabaseUrl}/functions/v1/rss-noticias`;
            queryString = buildQueryString(newsCriteria, defaultPredictedValues);
        }
        
        setGeneratedFeedUrl(queryString ? `${baseUrl}?${queryString}` : baseUrl);
    }, [activeTab, openJobsCriteria, predictedCriteria, newsCriteria]);
    
    // Copy handler for the custom feed URL
    const handleCopyCustomUrl = useCallback(async () => {
        const success = await copyToClipboard(generatedFeedUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    }, [generatedFeedUrl]);
    
    // Effect to lazy-load city data when needed for the 'Vagas Abertas' filter form
    useEffect(() => {
        if (!isCustomizerOpen || activeTab !== 'abertos') return;
        const state = openJobsCriteria.estado;
        if (state.length === 2 && !cityDataCache[state.toUpperCase()]) {
            const statesToLoad = [state.toUpperCase()];
            if (openJobsCriteria.incluirVizinhos && VIZINHANCAS_ESTADOS[state.toUpperCase()]) {
                statesToLoad.push(...VIZINHANCAS_ESTADOS[state.toUpperCase()]);
            }
            const unloadedStates = statesToLoad.filter(s => !cityDataCache[s]);
            if (unloadedStates.length > 0) {
                setIsCityDataLoading(true);
                Promise.all(unloadedStates.map(s => loadCitiesForState(s)))
                    .finally(() => setIsCityDataLoading(false));
            }
        }
    }, [openJobsCriteria.estado, openJobsCriteria.incluirVizinhos, cityDataCache, loadCitiesForState, activeTab, isCustomizerOpen]);

    // Memoized list of cities for the selected state to pass to the form
    const citiesForSelectedState = useMemo(() => {
        const state = openJobsCriteria.estado;
        if (state.length === 2 && cityDataCache[state.toUpperCase()]) {
            return [...cityDataCache[state.toUpperCase()]].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [openJobsCriteria.estado, cityDataCache]);

    // Tab definitions for the custom feed creator
    const tabItems: { id: RssTab; label: string }[] = [
        { id: 'abertos', label: 'Vagas Abertas' },
        { id: 'previstos', label: 'Concursos Previstos' },
        { id: 'noticias', label: 'Notícias' },
    ];
    
    // Function to render the correct filter form based on the active tab
    const renderFilterForm = () => {
        switch(activeTab) {
            case 'abertos':
                return <SearchFormContent criteria={openJobsCriteria} onCriteriaChange={setOpenJobsCriteria} isCityDataLoading={isCityDataLoading} cities={citiesForSelectedState} isModalView={true} isRssForm={true} />;
            case 'previstos':
                return <PredictedNewsFormContent criteria={predictedCriteria} onCriteriaChange={setPredictedCriteria} isModalView={true} isRssForm={true} />;
            case 'noticias':
                return <PredictedNewsFormContent criteria={newsCriteria} onCriteriaChange={setNewsCriteria} isModalView={true} isRssForm={true} />;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full fade-in pb-8 space-y-12">
            <header className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">Feeds RSS</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">Acompanhe as últimas atualizações de concursos diretamente no seu leitor de notícias, de forma geral ou com filtros personalizados.</p>
            </header>

            <section>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generalFeeds.map(feed => (
                        <FeedDisplay key={feed.title} {...feed} />
                    ))}
                </div>
            </section>
            
            <section>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setIsCustomizerOpen(prev => !prev)}
                        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        aria-expanded={isCustomizerOpen}
                        aria-controls="custom-feed-content"
                    >
                        <div className="flex items-center gap-4">
                            <FilterIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Crie seu Feed Personalizado</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Clique para expandir e criar um feed com filtros específicos.</p>
                            </div>
                        </div>
                        <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isCustomizerOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div id="custom-feed-content" className={`grid transition-all duration-300 ease-in-out ${isCustomizerOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                             <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                                <div className="mb-6">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">1. Escolha o tipo de feed:</label>
                                    <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Configure seus filtros:</h3>
                                    <div className="bg-gray-50/50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700/80">
                                        {renderFilterForm()}
                                    </div>
                                </div>
                                
                                <div className="mb-6">
                                    <Alert
                                        type="warning"
                                        title="Atenção"
                                        message="Se seus filtros forem muito específicos e não retornarem nenhum resultado no momento, o link gerado poderá apresentar erro em alguns leitores de RSS."
                                    />
                                </div>
                                
                                <div>
                                     <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">3. Copie o link do seu feed personalizado:</h3>
                                    <div className="space-y-3">
                                        <Input
                                            readOnly
                                            value={generatedFeedUrl}
                                            icon={<RssIcon className="h-5 w-5 text-orange-500" />}
                                            className="text-xs"
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                            aria-label="URL do Feed Personalizado"
                                        />
                                        <Button onClick={handleCopyCustomUrl} disabled={copied} className="w-full">
                                            {copied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
                                            <span className="ml-2">{copied ? 'Copiado!' : 'Copiar Link'}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
});

export default RssPage;