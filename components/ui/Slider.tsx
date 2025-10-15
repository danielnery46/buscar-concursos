import React from 'react';

export interface SliderProps {
    label: string;
    id: string;
    value: number | '';
    onChange: (value: number | '') => void;
    min: number;
    max: number;
    step: number;
    unit: string;
    valuePrefix?: string;
    valueSuffix?: string;
    disabled?: boolean;
    numberInput?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ label, id, value, onChange, min, max, step, unit, valuePrefix = '', valueSuffix = '', disabled = false, numberInput = false }) => {
    const displayValue = value ? `${valuePrefix}${Number(value).toLocaleString('pt-BR')}${valueSuffix}` : `Qualquer ${unit}`;
    
    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = e.target.valueAsNumber;
        if (isNaN(numValue)) {
            onChange('');
        } else if (numValue < min) {
            onChange(min);
        } else if (numValue > max) {
            onChange(max);
        } else {
            onChange(numValue);
        }
    };
    
    const sliderValue = value === '' ? min : Number(value);

    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{displayValue}</span>
            </div>
             <div className="flex items-center gap-3">
                <input
                    type="range"
                    id={id}
                    min={min}
                    max={max}
                    step={step}
                    value={sliderValue}
                    onChange={(e) => onChange(e.target.value === String(min) ? '' : Number(e.target.value))}
                    disabled={disabled}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                />
                {numberInput && (
                    <input
                        type="number"
                        value={value === '' ? '' : value}
                        onChange={handleNumberInputChange}
                        min={min}
                        max={max}
                        step={step}
                        disabled={disabled}
                        className="w-24 text-center text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                        placeholder={String(min)}
                    />
                )}
            </div>
        </div>
    );
};
