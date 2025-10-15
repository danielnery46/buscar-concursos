import React from 'react';
import { CheckIcon, AlertTriangleIcon } from '../Icons';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: React.ReactNode;
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message, title }) => {
  const config = {
    success: {
      icon: <CheckIcon className="h-5 w-5" />,
      classes: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      titleClass: 'text-emerald-800 dark:text-emerald-200',
    },
    error: {
      icon: <AlertTriangleIcon className="h-5 w-5" />,
      classes: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300',
      titleClass: 'text-red-800 dark:text-red-200',
    },
    warning: {
        icon: <AlertTriangleIcon className="h-5 w-5" />,
        classes: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/80 text-amber-700 dark:text-amber-300',
        titleClass: 'text-amber-800 dark:text-amber-200',
    },
    info: {
        icon: <CheckIcon className="h-5 w-5" />,
        classes: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300',
        titleClass: 'text-blue-800 dark:text-blue-200',
    }
  };

  const currentConfig = config[type];

  return (
    <div className={`p-3 border rounded-lg text-sm flex items-start gap-2 ${currentConfig.classes}`}>
        <div className="flex-shrink-0 mt-0.5">{currentConfig.icon}</div>
        <div>
            {title && <strong className={`font-semibold ${currentConfig.titleClass}`}>{title}</strong>}
            <div>{message}</div>
        </div>
    </div>
  );
};
