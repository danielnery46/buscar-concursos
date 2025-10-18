import React, { memo } from 'react';
import { AlertTriangleIcon } from './Icons';

export function InitialLoadErrorDisplay({ title, message }: { title: string; message: string; }) {
    return (
        <div className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border-2 border-dashed border-red-400/50 bg-red-50 dark:bg-[#2a1a1a] p-8 text-center flex flex-col items-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                    <AlertTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-900 dark:text-gray-100">{title}</h2>
                <p className="mt-2 text-base text-red-800/90 dark:text-gray-300/80 text-justify hyphens-auto">
                    {message}
                </p>
            </div>
        </div>
    );
}

export const EmptyStateDisplay = memo<{
    icon: React.ReactNode;
    title: string;
    message: string;
    children?: React.ReactNode;
}>(function EmptyStateDisplay({ icon, title, message, children }) {
    return (
        <div className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center p-8 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center min-h-[30vh]">
                <div className="mb-4 text-gray-400 dark:text-gray-500">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                <p className="mt-2 text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto text-justify hyphens-auto">
                    {message}
                </p>
                {children && <div className="mt-6">{children}</div>}
            </div>
        </div>
    );
});