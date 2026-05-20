import React from 'react';
import { AccessibilitySettings as AccessibilitySettingsType } from '../../types';
import { Switch } from '../ui/Switch';

interface AccessibilitySettingsProps {
    accessibilitySettings: AccessibilitySettingsType;
    onSettingsChange: (settings: Partial<AccessibilitySettingsType>) => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ accessibilitySettings, onSettingsChange }) => {
    return (
        <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            <Switch label="Alto contraste" description="Aumenta o contraste entre textos e fundos para facilitar a leitura." checked={accessibilitySettings.highContrast} onChange={(c) => onSettingsChange({ highContrast: c })} />
            <Switch label="Texto maior" description="Aumenta o tamanho da fonte em toda a aplicação." checked={accessibilitySettings.largerText} onChange={(c) => onSettingsChange({ largerText: c })} />
            <Switch label="Fonte para dislexia" description="Altera a fonte para um estilo que pode ser mais fácil de ler para pessoas com dislexia." checked={accessibilitySettings.dyslexicFont} onChange={(c) => onSettingsChange({ dyslexicFont: c })} />
            <Switch label="Destacar links" description="Adiciona sublinhado a todos os links e elementos clicáveis para melhor identificação." checked={accessibilitySettings.highlightLinks} onChange={(c) => onSettingsChange({ highlightLinks: c })} />
            <Switch label="Aumentar espaçamento do texto" description="Aumenta o espaçamento entre linhas, palavras e letras para melhorar a legibilidade." checked={accessibilitySettings.textSpacing} onChange={(c) => onSettingsChange({ textSpacing: c })} />
            <Switch label="Modo escala de cinza" description="Remove todas as cores da interface, o que pode ajudar com certos tipos de sensibilidade visual." checked={accessibilitySettings.grayscale} onChange={(c) => onSettingsChange({ grayscale: c })} />
            <Switch label="Reduzir movimento" description="Desativa a maioria das animações para uma experiência mais estática." checked={accessibilitySettings.reduceMotion} onChange={(c) => onSettingsChange({ reduceMotion: c })} />
        </div>
    );
};