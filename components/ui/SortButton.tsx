import { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { CheckIcon, SortIcon } from '../Icons';

interface SortButtonProps<T extends string> {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}

export function SortButton<T extends string>({ options, value, onChange }: SortButtonProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleToggle = () => setIsOpen(prev => !prev);
    const handleSelect = (optionValue: T) => {
      onChange(optionValue);
      setIsOpen(false);
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={menuRef}>
        <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            aria-label="Ordenar resultados"
            aria-haspopup="true"
            aria-expanded={isOpen}
        >
          <SortIcon className="h-6 w-6" />
        </Button>
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 p-1 origin-bottom-right menu-enter-active">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                    value === option.value
                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80'
                  }`}
                  role="menuitem"
                >
                  <span>{option.label}</span>
                  {value === option.value && <CheckIcon className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
}
