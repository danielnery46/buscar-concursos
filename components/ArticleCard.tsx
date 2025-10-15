import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { ProcessedPredictedJob, IconProps } from '../types';
import { copyToClipboard, prefetchUrl } from '../utils/helpers';
import {
    CalendarIcon,
    CheckIcon,
    ExternalLinkIcon,
    MapIcon,
    MaximizeIcon,
    ShareIcon,
} from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useCardInteraction } from '../hooks/useCardInteraction';

type PillType = 'location' | 'salary' | 'vacancies' | 'education' | 'roles' | 'deadline' | 'distance';

const InfoPill = memo(function InfoPill({ icon, text, pillType }: { icon: React.ReactElement<IconProps>; text: string | null | undefined; pillType: PillType }) {
    if (!text) return null;

    const colorClasses: Record<PillType, string> = {
        location: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
        salary: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
        vacancies: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
        education: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20',
        roles: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20',
        deadline: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
        distance: 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/20',
    };

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colorClasses[pillType]}`}>
            {React.cloneElement(icon, { className: "h-3.5 w-3.5" })}
            <span className="truncate">{text}</span>
        </div>
    );
});


interface ArticleCardProps {
    item: ProcessedPredictedJob;
    itemType: 'predicted' | 'news';
}

export const ArticleCard = memo<ArticleCardProps>(({ item, itemType }) => {
    const { accessibilitySettings } = useSettings();
    const { openLinksInModal } = accessibilitySettings;
    const { handleCardClick } = useCardInteraction({ link: item.link, title: item.title, openInModal: openLinksInModal });
    const [copied, setCopied] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openLinksInModal || !cardRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    prefetchUrl(item.link);
                    observer.unobserve(entry.target);
                }
            },
            {
                rootMargin: '200px',
            }
        );
        
        const currentCardRef = cardRef.current;
        if (currentCardRef) {
            observer.observe(currentCardRef);
        }

        return () => {
            if (currentCardRef) {
                observer.unobserve(currentCardRef);
            }
        };
    }, [item.link, openLinksInModal]);

    const handleShareClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const success = await copyToClipboard(item.link);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [item.link]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleCardClick(e);
        }
    }, [handleCardClick]);
    
    return (
        <div 
            ref={cardRef}
            onClick={handleCardClick} 
            onKeyDown={handleKeyDown} 
            role="button" 
            tabIndex={0} 
            title={openLinksInModal ? "Ctrl+clique para abrir em nova aba" : "Ctrl+clique para abrir na janela"}
            className="relative group flex flex-col h-full bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20 p-5 hover:border-indigo-500/50 dark:hover:border-indigo-500/80 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
        >
            <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-3" title={item.title}>
                        {item.title}
                    </h3>
                </div>
                <div className="flex-shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors ctrl-key-icon" title={itemType === 'predicted' ? "Ver previsão" : "Ler notícia"} aria-hidden="true">
                    { openLinksInModal ? (
                        <>
                            <MaximizeIcon className="h-5 w-5 icon-default" />
                            <ExternalLinkIcon className="h-5 w-5 icon-ctrl" />
                        </>
                    ) : (
                        <>
                            <ExternalLinkIcon className="h-5 w-5 icon-default" />
                            <MaximizeIcon className="h-5 w-5 icon-ctrl" />
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex-grow my-2"></div>
            
            <div className="mt-2 flex flex-wrap gap-2 items-center">
                <InfoPill icon={<CalendarIcon />} text={item.date} pillType="roles" />
                {item.mentionedStates.slice(0, 3).map(state => <InfoPill key={state} icon={<MapIcon />} text={state} pillType="location" />)}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {item.source && `Fonte: ${item.source}`}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 -mr-1.5">
                    <button onClick={handleShareClick} aria-label={copied ? "Link copiado!" : "Compartilhar"} title={copied ? "Link copiado!" : "Compartilhar"} className={`p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${copied ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        {copied ? <CheckIcon className="h-5 w-5" /> : <ShareIcon className="h-5 w-5"/>}
                    </button>
                </div>
            </div>
        </div>
    );
});