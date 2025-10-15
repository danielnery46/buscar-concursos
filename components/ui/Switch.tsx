import React, { memo } from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description: string;
}

export const Switch: React.FC<SwitchProps> = memo(({ checked, onChange, label, description }) => (
    <label className="flex items-center justify-between cursor-pointer px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="mr-4">
        <p className="font-semibold text-base text-gray-800 dark:text-gray-200">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-justify hyphens-auto">{description}</p>
      </div>
      <div className="relative flex-shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-12 h-7 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5`}></div>
      </div>
    </label>
));