import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, FC } from 'react';
import type { Theme, AccessibilitySettings } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { useDebounce } from '../hooks/useDebounce';
import { THEME_KEY, ACCESSIBILITY_SETTINGS_KEY } from '../constants';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme, event?: React.MouseEvent<HTMLButtonElement>) => void;
  accessibilitySettings: AccessibilitySettings;
  setAccessibilitySettings: React.Dispatch<React.SetStateAction<AccessibilitySettings>>;
  isSettingsLoaded: boolean;
}

const defaultSettings: AccessibilitySettings = { highContrast: false, largerText: false, reduceMotion: false, uiScale: 100, openLinksInModal: true, showQuickAccess: true, dyslexicFont: false, highlightLinks: false, textSpacing: false, grayscale: false };

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: FC<SettingsProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  const [theme, _setTheme] = useState<Theme>('auto');
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(defaultSettings);
  
  const debouncedTheme = useDebounce(theme, 1500);
  const debouncedAccessibilitySettings = useDebounce(accessibilitySettings, 1500);

  // Load initial settings
  useEffect(() => {
    const loadInitialSettings = async () => {
        if (authLoading) return;

        if (user) {
            const { data, error } = await supabase.from('user_data').select('theme, accessibility_settings').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') console.error('Error fetching settings:', error);
            
            const localSettings = JSON.parse(localStorage.getItem(ACCESSIBILITY_SETTINGS_KEY) || 'null') || defaultSettings;
            const cloudSettings = data?.accessibility_settings || {};
            
            _setTheme(data?.theme || localStorage.getItem(THEME_KEY) as Theme || 'auto');
            setAccessibilitySettings({ ...defaultSettings, ...localSettings, ...cloudSettings });

        } else {
            _setTheme(localStorage.getItem(THEME_KEY) as Theme || 'auto');
            setAccessibilitySettings(JSON.parse(localStorage.getItem(ACCESSIBILITY_SETTINGS_KEY) || 'null') || defaultSettings);
        }
        setIsSettingsLoaded(true);
    };

    loadInitialSettings();
  }, [user, authLoading]);

  // Debounced save for Theme
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveTheme = async () => {
        if (user) {
            const { error } = await supabase.from('user_data').upsert({ id: user.id, theme: debouncedTheme });
            if (error) console.error('Error saving theme:', error);
        } else {
            localStorage.setItem(THEME_KEY, debouncedTheme);
        }
    };
    saveTheme();
  }, [debouncedTheme, user, isSettingsLoaded]);
  
  // Debounced save for Accessibility Settings
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveAccessibilitySettings = async () => {
        if (user) {
            const { error } = await supabase.from('user_data').upsert({ id: user.id, accessibility_settings: debouncedAccessibilitySettings });
            if (error) console.error('Error saving accessibility settings:', error);
        } else {
            localStorage.setItem(ACCESSIBILITY_SETTINGS_KEY, JSON.stringify(debouncedAccessibilitySettings));
        }
    };
    saveAccessibilitySettings();
  }, [debouncedAccessibilitySettings, user, isSettingsLoaded]);

  // Apply theme to DOM
  useEffect(() => {
      const root = window.document.documentElement;
      if (theme === 'auto') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => root.classList.toggle('dark', mediaQuery.matches);
          handleChange();
          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
          root.classList.toggle('dark', theme === 'dark');
      }
  }, [theme]);
  
  // Apply accessibility settings to DOM
  useEffect(() => {
      const root = window.document.documentElement;
      root.dataset.contrast = accessibilitySettings.highContrast ? 'high' : 'normal';
      root.dataset.textSize = accessibilitySettings.largerText ? 'large' : 'normal';
      root.dataset.reduceMotion = accessibilitySettings.reduceMotion ? 'true' : 'false';
      root.dataset.fontDyslexic = accessibilitySettings.dyslexicFont ? 'true' : 'false';
      root.dataset.highlightLinks = accessibilitySettings.highlightLinks ? 'true' : 'false';
      root.dataset.textSpacing = accessibilitySettings.textSpacing ? 'true' : 'false';
      root.dataset.grayscale = accessibilitySettings.grayscale ? 'true' : 'false';
      (root.style as any).zoom = `${(accessibilitySettings.uiScale || 100) / 100}`;
  }, [accessibilitySettings]);
  
  // Custom theme setter with transition animation
  const setTheme = useCallback((newTheme: Theme, event?: React.MouseEvent<HTMLButtonElement>) => {
    const doc = document as any;
    if (doc.startViewTransition && !accessibilitySettings.reduceMotion && event) {
        const x = event.clientX;
        const y = event.clientY;
        const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

        doc.documentElement.style.setProperty('--x', `${x}px`);
        doc.documentElement.style.setProperty('--y', `${y}px`);
        doc.documentElement.style.setProperty('--r', `${endRadius}px`);
        
        doc.startViewTransition(() => {
            _setTheme(newTheme);
        });
    } else {
        document.body.classList.add('theme-in-transition');
        _setTheme(newTheme);
        setTimeout(() => {
            document.body.classList.remove('theme-in-transition');
        }, 500);
    }
  }, [accessibilitySettings.reduceMotion]);


  const value = {
    theme,
    setTheme,
    accessibilitySettings,
    setAccessibilitySettings,
    isSettingsLoaded
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
