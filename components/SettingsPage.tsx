import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { ActiveTab, IconProps, SettingsSectionId } from '../types';
import { LayoutGridIcon, SlidersIcon, SaveIcon, UserIcon } from './Icons';
import { AppearanceSettings, AccessibilitySettings, DataSettings, AccountSettings } from './settings';
import { Card } from './ui/Card';
import { cn } from '../utils/helpers';

interface SettingsSectionItem {
    id: SettingsSectionId;
    label: string;
    icon: React.ReactElement<IconProps>;
}

const sectionsData: SettingsSectionItem[] = [
    { id: 'appearance', label: 'Aparência', icon: <LayoutGridIcon className="h-6 w-6" /> },
    { id: 'accessibility', label: 'Acessibilidade', icon: <SlidersIcon className="h-6 w-6" /> },
    { id: 'data', label: 'Gerenciar Dados', icon: <SaveIcon className="h-6 w-6" /> },
    { id: 'account', label: 'Conta', icon: <UserIcon className="h-6 w-6" /> },
];

const SectionCard: React.FC<{ children: React.ReactNode; noPadding?: boolean }> = ({ children, noPadding = false }) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm fade-in">
        <div className={noPadding ? '' : 'p-0'}>
            {children}
        </div>
    </div>
);

interface SettingsPageProps {
    setActiveTab: (tab: ActiveTab) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ setActiveTab }) => {
    const { user, signOut } = useAuth();
    const { theme, setTheme, accessibilitySettings, setAccessibilitySettings } = useSettings();
    const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');

    const handleSettingsChange = useCallback((newSettings: Partial<typeof accessibilitySettings>) => {
        setAccessibilitySettings(prev => ({ ...prev, ...newSettings }));
    }, [setAccessibilitySettings]);

    const handleSignOut = useCallback(async () => {
        await signOut();
        setActiveTab('search');
    }, [signOut, setActiveTab]);

    const sections = useMemo(() => sectionsData.filter(section => {
        if (user) {
            return section.id !== 'data'; // Oculta 'Gerenciar Dados' para usuários logados
        }
        return section.id !== 'account'; // Oculta 'Conta' para usuários não logados
    }), [user]);
    
    // Gerencia a aba ativa ao logar/deslogar
    useEffect(() => {
        if (!user && activeSection === 'account') {
            setActiveSection('appearance');
        }
        if (user && activeSection === 'data') {
            setActiveSection('appearance');
        }
    }, [user, activeSection]);

    const sectionComponents = useMemo(() => ({
        'appearance': (
            <SectionCard noPadding>
                <AppearanceSettings 
                    theme={theme}
                    onThemeChange={setTheme}
                    accessibilitySettings={accessibilitySettings}
                    onSettingsChange={handleSettingsChange}
                />
            </SectionCard>
        ),
        'accessibility': (
            <SectionCard noPadding>
                <AccessibilitySettings 
                    accessibilitySettings={accessibilitySettings}
                    onSettingsChange={handleSettingsChange}
                />
            </SectionCard>
        ),
        'data': (
            <SectionCard noPadding>
                <DataSettings />
            </SectionCard>
        ),
        'account': user ? (
            <AccountSettings onSignOut={handleSignOut} />
        ) : (
            <Card>
                <div className="px-6 py-4">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Acessar Conta</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify hyphens-auto">Faça login ou crie uma conta para salvar suas configurações e favoritos na nuvem, acessando de qualquer dispositivo.</p>
                    <button
                        onClick={() => setActiveTab('auth')}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors"
                    >
                        Login / Criar Conta
                    </button>
                </div>
            </Card>
        ),
    }), [user, theme, setTheme, accessibilitySettings, handleSettingsChange, handleSignOut, setActiveTab]);


    return (
        <div className="max-w-4xl mx-auto w-full pb-8">
            <div>
                <div className="mb-6">
                    <nav className="border-b border-gray-200 dark:border-gray-800" aria-label="Abas de Configurações">
                        <div className="-mb-px flex space-x-2 sm:space-x-4" role="tablist">
                            {sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        'flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-1 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 rounded-t-md',
                                        activeSection === section.id
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                                    )}
                                    aria-current={activeSection === section.id ? 'page' : undefined}
                                >
                                     {section.icon}
                                     <span className="">{section.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>
                </div>
                {sectionComponents[activeSection]}
            </div>
        </div>
    );
};

export default SettingsPage;