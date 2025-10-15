import React, { useState, useRef, useEffect } from 'react';
import { FormattedSearchDetail } from '../types';
import {
    CheckIcon,
    CloseIcon,
    PencilIcon,
    RedoIcon,
    SaveOffIcon,
} from './Icons';
import { detailIconMap } from './Icons';
import { Button } from './ui/Button';

interface SavedItemsListProps<T> {
    items: T[];
    onRun: (item: T) => void;
    onRemove: (index: number) => void;
    onRename: (index: number, newName: string) => void;
    onClearAll?: () => void;
    formatItem: (item: Partial<T>) => { title: string; details: FormattedSearchDetail[] };
    emptyIcon: React.ReactNode;
    emptyTitle: string;
    emptyDescription: string;
}

export const SavedItemsList = <T extends {}>({
    items,
    onRun,
    onRemove,
    onRename,
    onClearAll,
    formatItem,
    emptyIcon,
    emptyTitle,
    emptyDescription,
}: SavedItemsListProps<T>) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleRenameClick = (index: number, currentName: string) => {
        setEditingIndex(index);
        setRenameValue(currentName);
    };

    const handleRenameConfirm = (index: number) => {
        if (renameValue.trim()) {
            onRename(index, renameValue.trim());
        }
        setEditingIndex(null);
    };

    const handleRenameCancel = () => {
        setEditingIndex(null);
    };

    useEffect(() => {
        if (editingIndex !== null) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editingIndex]);

    return (
        <>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm dark:shadow-none">
                {items.length > 0 ? (
                    <ul className="max-h-96 overflow-y-auto">
                        {items.map((item, index) => {
                            const { title, details } = formatItem(item);
                            return (
                                <li key={index} className="group relative">
                                    {editingIndex === index ? (
                                        <div className="p-3 border-b border-gray-100 dark:border-gray-800/50 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={() => handleRenameConfirm(index)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRenameConfirm(index);
                                                    if (e.key === 'Escape') handleRenameCancel();
                                                }}
                                                className="w-full text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-indigo-500 rounded-md shadow-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50" onClick={() => handleRenameConfirm(index)} aria-label="Confirmar renomeação">
                                                <CheckIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => onRun(item)} className="w-full text-left p-3 pr-20 border-b border-gray-100 dark:border-gray-800/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10" aria-label={`Refazer busca: ${title}`}>
                                                <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                                                    <RedoIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
                                                    {details.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            {details.map((detail, i) => (
                                                                <span key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                                    {detailIconMap[detail.type]} {detail.text}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                            <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center z-20">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRenameClick(index, title)} aria-label={`Renomear busca: ${title}`}>
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(index)} aria-label={`Remover busca: ${title}`}>
                                                    <CloseIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="px-3 py-6 text-center">
                        {emptyIcon}
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{emptyTitle}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{emptyDescription}</p>
                    </div>
                )}
            </div>
            {onClearAll && items.length > 0 && (
                <div className="mt-4">
                    <Button variant="destructive" size="md" onClick={onClearAll} className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border-2 border-red-100 dark:border-red-900/50">
                        <CloseIcon className="h-5 w-5" />
                        <span>Limpar Favoritos</span>
                    </Button>
                </div>
            )}
        </>
    );
};

interface DefaultItemViewProps<T> {
    item: T | null;
    onRemove: () => void;
    formatItem: (item: Partial<T>) => { title: string; details: FormattedSearchDetail[] };
    emptyIcon: React.ReactNode;
    emptyTitle: string;
    emptyDescription: string;
}

export const DefaultItemView = <T extends {}>({
    item,
    onRemove,
    formatItem,
    emptyIcon,
    emptyTitle,
    emptyDescription,
}: DefaultItemViewProps<T>) => {
    const details = item ? formatItem(item) : null;
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm dark:shadow-none">
            {item && details ? (
                <div className="p-4 space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{details.title}</p>
                        {details.details.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {details.details.map((detail, i) => (
                                    <span key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                        {detailIconMap[detail.type]} {detail.text}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                     <Button 
                        variant="destructive" 
                        size="md" 
                        onClick={onRemove}
                        className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border-2 border-red-100 dark:border-red-900/50"
                        aria-label="Remover busca padrão"
                    >
                        <SaveOffIcon className="h-5 w-5"/>
                        <span>Remover Padrão</span>
                    </Button>
                </div>
            ) : (
                <div className="px-3 py-6 text-center">
                    {emptyIcon}
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{emptyTitle}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{emptyDescription}</p>
                </div>
            )}
        </div>
    );
};
