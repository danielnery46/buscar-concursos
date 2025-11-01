import React, { useState, useEffect, useRef, memo } from 'react';
import { NavItem, ActiveTab } from '../types';
import { 
    BuscarConcursosIcon, FilterIcon, BellIcon, TabNewsIcon, TabSearchIcon, SettingsIcon, TabSupportIcon, 
    UserIcon, LogOutIcon, ChevronDownIcon, CheckIcon, CoffeeIcon, RssIcon 
} from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const mainNavItems: NavItem[] = [
    { id: 'search', label: 'Abertos', icon: <TabSearchIcon className="h-6 w-6" /> },
    { id: 'predicted', label: 'Previstos', icon: <BellIcon className="h-6 w-6" /> },
    { id: 'news', label: 'Notícias', icon: <TabNewsIcon className="h-6 w-6" /> },
];

const otherNavItems = [
    { id: 'settings' as const, label: 'Configurações', icon: <SettingsIcon className="h-5 w-5" /> },
    { id: 'support' as const, label: 'Suporte', icon: <TabSupportIcon className="h-5 w-5" /> },
    { id: 'rss' as const, label: 'RSS Feeds', icon: <RssIcon className="h-5 w-5" /> },
];

const allNavItems: NavItem[] = [
    ...mainNavItems,
    { id: 'settings', label: 'Configurações', icon: <SettingsIcon className="h-6 w-6" /> },
    { id: 'support', label: 'Suporte', icon: <TabSupportIcon className="h-6 w-6" /> },
    { id: 'rss', label: 'RSS Feeds', icon: <RssIcon className="h-6 w-6" /> },
    { id: 'auth', label: 'Login / Conta', icon: <UserIcon className="h-6 w-6" /> },
];

interface HeaderMenuProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
}

const HeaderMenu: React.FC<HeaderMenuProps> = memo(({ activeTab, setActiveTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, signOut } = useAuth();
    const { openModal } = useModal();

    const activeItem = allNavItems.find(item => item.id === activeTab) || mainNavItems[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigation = (tab: ActiveTab) => {
        setActiveTab(tab);
        setIsOpen(false);
    };

    const handleSignOut = async () => {
        await signOut();
        setIsOpen(false);
        setActiveTab('search');
    };

    const handleOpenDonation = () => {
        openModal('donation', {});
        setIsOpen(false);
    };

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black focus-visible:ring-indigo-500 bg-slate-200/60 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Selecionar aba de navegação"
            >
                {React.cloneElement(activeItem.icon, { className: 'h-6 w-6 flex-shrink-0'})}
                <span className="hidden md:inline">{activeItem.label}</span>
                <ChevronDownIcon className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                 <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30 p-1.5 origin-top-right menu-enter-active">
                    <button onClick={handleOpenDonation} className="w-full flex items-center gap-3 text-left px-3 py-2 text-sm rounded-md font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                        <CoffeeIcon className="h-5 w-5" />
                        <span>Apoie o projeto</span>
                    </button>
                    <div className="my-1.5 h-px bg-gray-200 dark:bg-gray-700"></div>
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase">Concursos</div>
                    {mainNavItems.map(item => (
                        <button key={item.id} onClick={() => handleNavigation(item.id)} className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 text-sm rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80">
                            <div className="flex items-center gap-3">
                                {React.cloneElement(item.icon, { className: 'h-5 w-5' })}
                                <span>{item.label}</span>
                            </div>
                            {activeTab === item.id && <CheckIcon className="h-5 w-5 text-indigo-500" />}
                        </button>
                    ))}
                    <div className="my-1.5 h-px bg-gray-200 dark:bg-gray-700"></div>
                    <div className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-400 uppercase">Opções</div>
                    {otherNavItems.map(item => (
                        <button key={item.id} onClick={() => handleNavigation(item.id)} className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 text-sm rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80">
                            <div className="flex items-center gap-3">
                                {React.cloneElement(item.icon, { className: 'h-5 w-5' })}
                                <span>{item.label}</span>
                            </div>
                            {activeTab === item.id && <CheckIcon className="h-5 w-5 text-indigo-500" />}
                        </button>
                    ))}
                     <div className="my-1.5 h-px bg-gray-200 dark:bg-gray-700"></div>
                    {user ? (
                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 text-left px-3 py-2 text-sm rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                            <LogOutIcon className="h-5 w-5" />
                            <span>Sair ({user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]})</span>
                        </button>
                    ) : (
                        <button onClick={() => handleNavigation('auth')} className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 text-sm rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80">
                            <div className="flex items-center gap-3">
                                <LogOutIcon className="h-5 w-5 -scale-x-100" />
                                <span>Login / Criar Conta</span>
                            </div>
                            {activeTab === 'auth' && <CheckIcon className="h-5 w-5 text-indigo-500" />}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

interface HeaderProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    filterConfig?: {
        setOpen: (open: boolean) => void;
        count: number;
    }
}

export const Header: React.FC<HeaderProps> = memo(({ activeTab, setActiveTab, filterConfig }) => {
    const { openModal } = useModal();
    
    return (
        <header className="fixed top-0 left-0 right-0 flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 bg-slate-100/80 dark:bg-black/80 backdrop-blur-sm border-b border-slate-200/80 dark:border-gray-800/80 z-30">
            <button
                type="button"
                onClick={() => openModal('donation', {})}
                aria-label="Apoiar o projeto"
                className="flex items-center justify-start gap-2 sm:gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black transition-opacity hover:opacity-80 -ml-2 p-2"
            >
                <BuscarConcursosIcon className="h-10 w-10 sm:h-11 sm:w-11" />
                <h1 className="text-xl sm:text-2xl font-bold">
                    <span className="max-[379px]:hidden">
                        <span className="text-gray-800 dark:text-gray-100">Buscar </span>
                        <span className="text-indigo-600 dark:text-indigo-400">Concursos</span>
                    </span>
                    <span className="hidden max-[379px]:inline">
                        <span className="text-gray-800 dark:text-gray-100">B</span><span className="text-indigo-600 dark:text-indigo-400">C</span>
                    </span>
                </h1>
            </button>

            <div className="flex items-center justify-end gap-2">
                {filterConfig && (
                     <div className="flex items-center gap-1">
                        <button
                            onClick={() => filterConfig.setOpen(true)}
                            className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-slate-200/60 dark:hover:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors active:scale-95"
                            aria-label="Abrir painel de filtros"
                        >
                            <FilterIcon className="h-6 w-6" />
                            {filterConfig.count > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-white dark:ring-black">
                                    {filterConfig.count}
                                </span>
                            )}
                        </button>
                    </div>
                )}
                <HeaderMenu activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        </header>
    );
});