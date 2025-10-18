import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, FC } from 'react';
import type { Theme, AccessibilitySettings, Json } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { useDebounce } from '../hooks/useDebounce';
import { 
    THEME_KEY, 
    ACCESSIBILITY_SETTINGS_KEY,
    ROTA_CIDADE_KEY, 
    FAVORITE_SEARCHES_KEY, 
    FAVORITE_PREDICTED_FILTERS_KEY, 
    FAVORITE_NEWS_FILTERS_KEY,
    DEFAULT_SEARCH_KEY, 
    DEFAULT_PREDICTED_FILTER_KEY, 
    DEFAULT_NEWS_FILTER_KEY
} from '../constants';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme, event?: React.MouseEvent<HTMLButtonElement>) => void;
  accessibilitySettings: AccessibilitySettings;
  setAccessibilitySettings: React.Dispatch<React.SetStateAction<AccessibilitySettings>>;
  isSettingsLoaded: boolean;
}

const defaultSettings: AccessibilitySettings = { highContrast: false, largerText: false, reduceMotion: false, uiScale: 100, openLinksInModal: true, showQuickAccess: true, dyslexicFont: false, highlightLinks: false, textSpacing: false, grayscale: false };
const getLocalItem = (key: string, defaultValue: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
};
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

        // This check must be identical to the one in UserDataContext to prevent deadlocks.
        const isDifferent = (key: string, defaultValue: any) => {
            const item = localStorage.getItem(key);
            if (item === null) return false;
            try {
                const localValue = JSON.parse(item);
                return JSON.stringify(localValue) !== JSON.stringify(defaultValue);
            } catch (e) {
                if (key === THEME_KEY) {
                    return item !== defaultValue;
                }
                return true; // Assume modified if parsing fails
            }
        };

        const anyLocalDataIsModified = () => {
            if (isDifferent(ROTA_CIDADE_KEY, '')) return true;
            if (isDifferent(FAVORITE_SEARCHES_KEY, [])) return true;
            if (isDifferent(FAVORITE_PREDICTED_FILTERS_KEY, [])) return true;
            if (isDifferent(FAVORITE_NEWS_FILTERS_KEY, [])) return true;
            if (isDifferent(DEFAULT_SEARCH_KEY, null)) return true;
            if (isDifferent(DEFAULT_PREDICTED_FILTER_KEY, null)) return true;
            if (isDifferent(DEFAULT_NEWS_FILTER_KEY, null)) return true;
            if (isDifferent(THEME_KEY, 'auto')) return true;
            if (isDifferent(ACCESSIBILITY_SETTINGS_KEY, defaultSettings)) return true;
            return false;
        };

        if (user && anyLocalDataIsModified()) {
            console.log("SettingsContext: User logged in with modified local data. Awaiting migration decision.");
            // Don't load anything yet. Wait for the migrationDecision event from UserDataContext.
            return;
        }

        if (user) {
            const { data, error } = await supabase.from('user_data').select('theme, accessibility_settings').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') console.error('Error fetching settings:', error);
            
            _setTheme((data?.theme as Theme) || 'auto');
            setAccessibilitySettings((data?.accessibility_settings as unknown as AccessibilitySettings) ?? defaultSettings);
        } else {
            _setTheme(localStorage.getItem(THEME_KEY) as Theme || 'auto');
            setAccessibilitySettings(JSON.parse(localStorage.getItem(ACCESSIBILITY_SETTINGS_KEY) || 'null') || defaultSettings);
        }
        setIsSettingsLoaded(true);
    };

    loadInitialSettings();
  }, [user, authLoading]);

  // Event listener for migration decision
  useEffect(() => {
    const handleMigrationDecision = async (event: Event) => {
        const { action } = (event as CustomEvent).detail;
        console.log(`SettingsContext received migration decision: ${action}`);
        const settingsKeys = [THEME_KEY, ACCESSIBILITY_SETTINGS_KEY];
        
        if (!user) { // Safeguard
            settingsKeys.forEach(key => localStorage.removeItem(key));
            setIsSettingsLoaded(true);
            return;
        }

        const { data: cloudData } = await supabase.from('user_data').select('theme, accessibility_settings').eq('id', user.id).single();

        if (action === 'migrate') {
            const localTheme = localStorage.getItem(THEME_KEY) as Theme | null;
            const localSettings = getLocalItem(ACCESSIBILITY_SETTINGS_KEY, null);

            // Merge with local data taking precedence for settings.
            const mergedTheme = localTheme && localTheme !== 'auto' ? localTheme : (cloudData?.theme || 'auto');
            const mergedSettings = { ...defaultSettings, ...(cloudData?.accessibility_settings as object || {}), ...(localSettings || {}) };
            
            _setTheme(mergedTheme as Theme);
            setAccessibilitySettings(mergedSettings);
        } else { // discard
            _setTheme((cloudData?.theme as Theme) || 'auto');
            setAccessibilitySettings((cloudData?.accessibility_settings as unknown as AccessibilitySettings) ?? defaultSettings);
        }
        
        settingsKeys.forEach(key => localStorage.removeItem(key));
        setIsSettingsLoaded(true);
    };

    window.addEventListener('migrationDecision', handleMigrationDecision);
    return () => {
        window.removeEventListener('migrationDecision', handleMigrationDecision);
    };
}, [user]);

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
            const { error } = await supabase.from('user_data').upsert({ id: user.id, accessibility_settings: debouncedAccessibilitySettings as unknown as Json });
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