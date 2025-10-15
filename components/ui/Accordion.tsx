import React from 'react';
import { ChevronDownIcon } from '../Icons';

interface AccordionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  summary?: string | null;
}

export const Accordion: React.FC<AccordionProps> = ({ title, icon, children, isOpen, onToggle, summary }) => {
    return (
        <div className="border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between p-4 text-left transition-colors rounded-t-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 text-indigo-500 dark:text-indigo-400">{icon}</div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!isOpen && summary && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[150px]">{summary}</p>
                    )}
                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="px-4 py-5 space-y-4 bg-gray-50/50 dark:bg-black/20">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};