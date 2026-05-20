import React from 'react';
import { CheckIcon } from '../Icons';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        className={`h-4 w-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-900 dark:ring-offset-gray-900 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';


export const CustomCheckbox: React.FC<{
    id: string;
    value: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children: React.ReactNode;
}> = React.memo(({ id, value, checked, onChange, children }) => {
    const baseClasses = "flex items-center justify-center text-center px-3 py-2 rounded-md border transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800 focus-within:ring-indigo-500";
    const uncheckedClasses = "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400";
    const checkedClasses = "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300 font-semibold";

    return (
        <label htmlFor={id} className={`${baseClasses} ${checked ? checkedClasses : uncheckedClasses}`}>
            <input type="checkbox" id={id} value={value} checked={checked} onChange={onChange} className="sr-only" />
            {checked && <CheckIcon className="h-4 w-4 -ml-1 mr-1.5 flex-shrink-0"/>}
            <span className="text-sm font-medium">{children}</span>
        </label>
    );
});