import React, { memo } from 'react';
import { AccessibilitySettings, Theme } from '../../types';
import { MoonIcon, SunIcon, SunMoonIcon } from '../Icons';
import { Switch } from '../ui/Switch';

interface AppearanceSettingsProps {
    theme: Theme;
    onThemeChange: (theme: Theme, event: React.MouseEvent<HTMLButtonElement>) => void;
    accessibilitySettings: AccessibilitySettings;
    onSettingsChange: (settings: Partial<AccessibilitySettings>) => void;
}

const ThemeSelector: React.FC<{ theme: Theme; onThemeChange: (theme: Theme, event: React.MouseEvent<HTMLButtonElement>) => void; }> = memo(({ theme, onThemeChange }) => {
    const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
        { id: 'auto', label: 'Automático', icon: <SunMoonIcon className="h-5 w-5" /> },
        { id: 'light', label: 'Claro', icon: <SunIcon className="h-5 w-5" /> },
        { id: 'dark', label: 'Escuro', icon: <MoonIcon className="h-5 w-5" /> },
    ];

    return (
        <div className="px-6 py-4">
            <p className="font-semibold text-base text-gray-800 dark:text-gray-200">Tema</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-justify hyphens-auto">Escolha como a interface deve ser exibida. O padrão é 'Automático', que usa a preferência do seu sistema.</p>
            <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-1 border border-gray-200 dark:border-gray-700/80">
                {themes.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={(e) => onThemeChange(t.id, e)}
                        className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500 ${
                            theme === t.id
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/60'
                        }`}
                        aria-pressed={theme === t.id}
                    >
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
});

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ theme, onThemeChange, accessibilitySettings, onSettingsChange }) => {
    return (
        <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
            <Switch label="Abrir links externos em uma janela" description="Quando ativado, links de notícias e concursos abrem em uma janela de pré-visualização." checked={accessibilitySettings.openLinksInModal ?? true} onChange={(c) => onSettingsChange({ openLinksInModal: c })} />
            <Switch label="Mostrar Acesso Rápido de Favoritos" description="Exibe seus atalhos de buscas favoritas nas páginas de busca." checked={accessibilitySettings.showQuickAccess ?? true} onChange={(c) => onSettingsChange({ showQuickAccess: c })} />
            <div className="px-6 py-4">
                <label htmlFor="ui-scale-slider" className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-base text-gray-800 dark:text-gray-200">Tamanho da interface</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{accessibilitySettings.uiScale || 100}%</span>
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-justify hyphens-auto">Ajuste o zoom geral da aplicação. O padrão é 100%.</p>
                <input id="ui-scale-slider" type="range" min="80" max="130" step="5" value={accessibilitySettings.uiScale} onChange={(e) => onSettingsChange({ uiScale: parseInt(e.target.value, 10) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
        </div>
    );
};