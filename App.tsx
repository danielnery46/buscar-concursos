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

import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { ActiveTab, AuthView } from './types';
import { TUTORIAL_KEY } from './constants';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { useUserData } from './contexts/UserDataContext';
import { useModal } from './contexts/ModalContext';
import { useAppData } from './hooks/useAppData';
import { InitialLoadErrorDisplay } from './components/StateDisplays';
import { Header } from './components/Header';

// Componentes estáticos para corrigir o crash
import PredictedJobsPage from './components/PredictedJobsPage';
import NewsPage from './components/NewsPage';

const SearchPage = lazy(() => import('./components/SearchPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));

const pageComponents: { [key in ActiveTab]?: React.LazyExoticComponent<any> | React.FC<any> } = {
    search: SearchPage,
    predicted: PredictedJobsPage,
    news: NewsPage,
    settings: SettingsPage,
    support: SupportPage,
    auth: AuthPage,
};

// --- Componente Principal ---

const App: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { isUserDataLoaded } = useUserData();
    const { isSettingsLoaded } = useSettings();
    const { openModal } = useModal();
    
    const {
        processedJobs,
        processedPredictedJobs,
        processedNews,
        isInitialLoading,
        initialLoadError,
        cityDataCache,
    } = useAppData();
    
    const [activeTab, setActiveTab] = useState<ActiveTab>('search');
    const [authView, setAuthView] = useState<AuthView>('login');
    const [activeFilterCount, setActiveFilterCount] = useState(0);

    const [openFilterPanel, setOpenFilterPanel] = useState<ActiveTab | null>(null);
    
    const mainContentRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Control') document.body.classList.add('ctrl-pressed'); };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') document.body.classList.remove('ctrl-pressed'); };
        const handleBlur = () => document.body.classList.remove('ctrl-pressed');
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);
    
    useEffect(() => { if (!authLoading && isUserDataLoaded) setActiveTab('search'); }, [authLoading, isUserDataLoaded]);
    useEffect(() => { if (user && activeTab === 'auth' && (authView === 'login' || authView === 'signup')) setActiveTab('search'); }, [user, activeTab, authView]);
    
    useEffect(() => {
        mainContentRef.current?.scrollTo(0, 0);
    }, [activeTab]);

    useEffect(() => {
        const tutorialCompleted = localStorage.getItem(TUTORIAL_KEY);
        if (!isInitialLoading && !tutorialCompleted) {
          openModal('tutorial', { onDone: () => localStorage.setItem(TUTORIAL_KEY, 'true') });
        }
    }, [isInitialLoading, openModal]);

    const setIsFiltersOpen = useCallback((isOpen: boolean) => {
        setOpenFilterPanel(isOpen ? activeTab : null);
    }, [activeTab]);

    const renderContent = () => {
        if (authLoading || !isUserDataLoaded || !isSettingsLoaded) {
            return (
                <div className="flex-grow flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
                </div>
            );
        }

        const ActivePageComponent = pageComponents[activeTab];
        if (!ActivePageComponent) return null;

        const commonPageProps = {
            mainContentRef,
            isFiltersOpen: openFilterPanel === activeTab,
            setIsFiltersOpen: setIsFiltersOpen,
            onFilterCountChange: setActiveFilterCount,
        };

        const pageProps: { [key in ActiveTab]?: any } = {
            auth: { view: authView, onViewChange: setAuthView, initialEmail: user?.email },
            search: { ...commonPageProps, jobs: processedJobs, isInitialLoading, cityDataCache },
            predicted: { ...commonPageProps, predictedJobs: processedPredictedJobs, isLoading: isInitialLoading },
            news: { ...commonPageProps, news: processedNews, isLoading: isInitialLoading },
            settings: { setActiveTab },
            support: {},
        };
        
        return <ActivePageComponent {...pageProps[activeTab]} />;
    };

    const hasError = initialLoadError && (activeTab === 'search' || activeTab === 'predicted' || activeTab === 'news');
    
    const filterableTabs: ActiveTab[] = ['search', 'predicted', 'news'];
    const filterConfig = filterableTabs.includes(activeTab)
        ? {
            setOpen: (isOpen: boolean) => setOpenFilterPanel(isOpen ? activeTab : null),
            count: activeFilterCount,
          }
        : undefined;

    return (
        <div className="flex flex-col h-screen bg-slate-100 dark:bg-black text-gray-800 dark:text-gray-200">
            <Header 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filterConfig={filterConfig}
            />
            <div ref={mainContentRef} className="flex-1 overflow-y-auto">
                <main className="flex-grow flex flex-col px-4 sm:px-6 lg:px-8 pt-6">
                    {hasError ? (
                        <InitialLoadErrorDisplay title="Erro ao Carregar Dados" message="Não foi possível carregar os dados. Por favor, tente recarregar a página." />
                    ) : (
                        <Suspense fallback={<div className="flex-grow flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>}>
                            {renderContent()}
                        </Suspense>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;