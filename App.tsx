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
import { ConnectionErrorBanner } from './components/ConnectionErrorBanner';

// Persist page state by importing them statically instead of lazy loading.
import SearchPage from './components/SearchPage';
import PredictedJobsPage from './components/PredictedJobsPage';
import NewsPage from './components/NewsPage';

// Other pages can be lazy-loaded as their state is less critical to preserve.
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const RssPage = lazy(() => import('./components/RssPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));


// --- Main App Component ---

const App: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { isUserDataLoaded } = useUserData();
    const { isSettingsLoaded } = useSettings();
    const { openModal } = useModal();
    
    const {
        isInitialLoading: isAppInfraLoading,
        initialLoadError: appInfraError,
        cityDataCache,
        loadCitiesForState,
    } = useAppData();
    
    const [activeTab, setActiveTab] = useState<ActiveTab>('search');
    const [authView, setAuthView] = useState<AuthView>('login');
    const [filterCounts, setFilterCounts] = useState<Record<string, number>>({
        search: 0,
        predicted: 0,
        news: 0,
    });
    const [openFilterPanel, setOpenFilterPanel] = useState<ActiveTab | null>(null);
    const [showConnectionError, setShowConnectionError] = useState(false);
    const [isInitialAppLoad, setIsInitialAppLoad] = useState(true);
    
    const mainContentRef = useRef<HTMLDivElement>(null);

    // Memoize callbacks to stabilize props and prevent unnecessary re-renders in child components,
    // which was causing focus trap issues in the filter panels.
    const setIsSearchFiltersOpen = useCallback((isOpen: boolean) => setOpenFilterPanel(isOpen ? 'search' : null), []);
    const setIsPredictedFiltersOpen = useCallback((isOpen: boolean) => setOpenFilterPanel(isOpen ? 'predicted' : null), []);
    const setIsNewsFiltersOpen = useCallback((isOpen: boolean) => setOpenFilterPanel(isOpen ? 'news' : null), []);

    const handleFilterSetOpen = useCallback((isOpen: boolean) => {
        if (activeTab === 'search') setIsSearchFiltersOpen(isOpen);
        if (activeTab === 'predicted') setIsPredictedFiltersOpen(isOpen);
        if (activeTab === 'news') setIsNewsFiltersOpen(isOpen);
    }, [activeTab, setIsSearchFiltersOpen, setIsPredictedFiltersOpen, setIsNewsFiltersOpen]);

    // Effect to detect Ctrl key press for link opening behavior
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
    
    // General navigation and state management effects
    useEffect(() => {
        if (!authLoading && isUserDataLoaded && isInitialAppLoad) {
            setActiveTab('search');
            setIsInitialAppLoad(false);
        }
    }, [authLoading, isUserDataLoaded, isInitialAppLoad]);
    
    useEffect(() => { if (user && activeTab === 'auth' && (authView === 'login' || authView === 'signup')) setActiveTab('search'); }, [user, activeTab, authView]);
    
    // Scroll to top when tab changes
    useEffect(() => {
        mainContentRef.current?.scrollTo(0, 0);
    }, [activeTab]);

    // Show tutorial for new users
    useEffect(() => {
        const tutorialCompleted = localStorage.getItem(TUTORIAL_KEY);
        if (!isAppInfraLoading && !tutorialCompleted) {
          openModal('tutorial', { onDone: () => localStorage.setItem(TUTORIAL_KEY, 'true') });
        }
    }, [isAppInfraLoading, openModal]);

    // Effect to listen for global network errors
    useEffect(() => {
        const handleNetworkError = () => {
            setShowConnectionError(true);
        };
        window.addEventListener('networkError', handleNetworkError);
        return () => {
            window.removeEventListener('networkError', handleNetworkError);
        };
    }, []);
    
    const filterableTabs: ActiveTab[] = ['search', 'predicted', 'news'];
    const filterConfig = filterableTabs.includes(activeTab)
        ? {
            setOpen: handleFilterSetOpen,
            count: filterCounts[activeTab] ?? 0,
          }
        : undefined;
    
    const isAppLoading = authLoading || !isUserDataLoaded || !isSettingsLoaded;

    return (
        <div className="flex flex-col h-screen bg-slate-100 dark:bg-black text-gray-800 dark:text-gray-200">
            <Header 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filterConfig={filterConfig}
            />
            <div ref={mainContentRef} className="flex-1 overflow-y-auto flex flex-col">
                {isAppLoading ? (
                    <div className="flex-grow flex items-center justify-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
                    </div>
                ) : (
                    <main className="flex-grow flex flex-col px-4 sm:px-6 lg:px-8 pt-6">
                        {appInfraError ? (
                            <InitialLoadErrorDisplay title="Erro de Infraestrutura" message="Não foi possível carregar dados essenciais da aplicação, como a lista de cidades. A busca por distância pode não funcionar." />
                        ) : (
                            <>
                                {/* Persistent Tabs */}
                                <div className={activeTab === 'search' ? 'flex flex-col flex-grow' : 'hidden'}>
                                    <SearchPage 
                                        isActive={activeTab === 'search'}
                                        mainContentRef={mainContentRef}
                                        isFiltersOpen={openFilterPanel === 'search'}
                                        setIsFiltersOpen={setIsSearchFiltersOpen}
                                        onFilterCountChange={(count: number) => setFilterCounts(p => ({...p, search: count}))}
                                        cityDataCache={cityDataCache}
                                        loadCitiesForState={loadCitiesForState}
                                    />
                                </div>
                                <div className={activeTab === 'predicted' ? 'flex flex-col flex-grow' : 'hidden'}>
                                    <PredictedJobsPage
                                        isActive={activeTab === 'predicted'}
                                        mainContentRef={mainContentRef}
                                        isFiltersOpen={openFilterPanel === 'predicted'}
                                        setIsFiltersOpen={setIsPredictedFiltersOpen}
                                        onFilterCountChange={(count: number) => setFilterCounts(p => ({...p, predicted: count}))}
                                    />
                                </div>
                                <div className={activeTab === 'news' ? 'flex flex-col flex-grow' : 'hidden'}>
                                    <NewsPage
                                        isActive={activeTab === 'news'}
                                        mainContentRef={mainContentRef}
                                        isFiltersOpen={openFilterPanel === 'news'}
                                        setIsFiltersOpen={setIsNewsFiltersOpen}
                                        onFilterCountChange={(count: number) => setFilterCounts(p => ({...p, news: count}))}
                                    />
                                </div>

                                {/* Non-Persistent (Lazy-Loaded) Tabs */}
                                <Suspense fallback={<div className="flex-grow flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>}>
                                    {activeTab === 'settings' && <SettingsPage setActiveTab={setActiveTab} />}
                                    {activeTab === 'support' && <SupportPage />}
                                    {activeTab === 'rss' && <RssPage cityDataCache={cityDataCache} loadCitiesForState={loadCitiesForState} />}
                                    {activeTab === 'auth' && <AuthPage view={authView} onViewChange={setAuthView} initialEmail={user?.email} />}
                                </Suspense>
                            </>
                        )}
                    </main>
                )}
            </div>
            <ConnectionErrorBanner isVisible={showConnectionError} onDismiss={() => setShowConnectionError(false)} />
        </div>
    );
};

export default App;