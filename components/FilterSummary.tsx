import React, { memo } from 'react';
import { BriefcaseIcon, UsersIcon, TrendingUpIcon } from './Icons';
import { formatCurrency } from '../utils/formatters';

interface FilterSummaryProps {
    totalOpportunities: number;
    totalVacancies?: number;
    highestSalary?: number;
    isLoading: boolean;
    opportunitiesLabel?: string;
    opportunitiesIcon?: React.ReactNode;
}

function CompactSummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
                {icon}
                <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{label}</span>
            </div>
            <span className="font-semibold text-base text-gray-800 dark:text-gray-200 text-right">{value}</span>
        </div>
    );
}

export const FilterSummary = memo(function FilterSummary({ totalOpportunities, totalVacancies, highestSalary, isLoading, opportunitiesLabel = "Oportunidades", opportunitiesIcon = <BriefcaseIcon className="h-5 w-5 text-blue-500" /> }: FilterSummaryProps) {
    return (
        <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Resumo da Busca</h2>
            {isLoading ? (
                <div className="mt-1 space-y-1 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-2/3"></div>
                            <div className="h-5 bg-gray-200 dark:bg-gray-700/80 rounded w-1/4"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-1 divide-y divide-gray-100 dark:divide-gray-800/50">
                    <CompactSummaryItem icon={opportunitiesIcon} label={opportunitiesLabel} value={totalOpportunities.toLocaleString('pt-BR')} />
                    {totalVacancies !== undefined && <CompactSummaryItem icon={<UsersIcon className="h-5 w-5 text-amber-500" />} label="Vagas" value={totalVacancies.toLocaleString('pt-BR')} />}
                    {highestSalary !== undefined && <CompactSummaryItem icon={<TrendingUpIcon className="h-5 w-5 text-emerald-500" />} label="Maior Salário" value={formatCurrency(highestSalary)} />}
                </div>
            )}
        </div>
    )
});