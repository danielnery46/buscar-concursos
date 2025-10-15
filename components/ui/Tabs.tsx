import React from 'react';

interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  type?: 'primary' | 'secondary';
}

export function Tabs<T extends string>({ items, activeTab, onTabChange, type = 'primary' }: TabsProps<T>) {
  const containerClasses = type === 'primary' 
    ? "p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
    : "p-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-1 border border-gray-200 dark:border-gray-700";

  const buttonBaseClasses = 'flex-1 flex items-center justify-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800/50 focus-visible:ring-indigo-500';

  const buttonActiveClasses = 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm';
  const buttonInactiveClasses = 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/60';

  if (type === 'secondary') {
    return (
        <div className={containerClasses}>
             {items.map(item => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={`${buttonBaseClasses} ${activeTab === item.id ? buttonActiveClasses : buttonInactiveClasses}`}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                >
                    {item.icon}
                </button>
            ))}
        </div>
    );
  }

  return (
    <div className={containerClasses}>
        <nav className="flex flex-wrap gap-1.5" role="tablist">
            {items.map(tab => (
                 (tab.count === undefined || tab.count > 0) && (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`${buttonBaseClasses} sm:px-4 sm:py-2.5 sm:text-base ${activeTab === tab.id ? buttonActiveClasses : buttonInactiveClasses}`}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                             <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${activeTab === tab.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300' : 'bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                )
            ))}
        </nav>
    </div>
  );
}