import React, { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import { ProcessedJob, IconProps } from '../types';
import { copyToClipboard, prefetchUrl } from '../utils/helpers';
import {
    CalendarIcon,
    CheckIcon,
    CompassIcon,
    ExternalLinkIcon,
    MaximizeIcon,
    RouteIcon,
    ShareIcon
} from './Icons';
import { detailIconMap } from './Icons';
import { useModal } from '../contexts/ModalContext';
import { useUserData } from '../contexts/UserDataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCardInteraction } from '../hooks/useCardInteraction';
import { supabase } from '../utils/supabase';


interface ResultCardProps {
    job: ProcessedJob;
    showLocationPillForStateJobs: boolean;
}

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

export const ResultCard = memo<ResultCardProps>(function ResultCard({ job, showLocationPillForStateJobs }) {
    const { openModal } = useModal();
    const { cidadeRota } = useUserData();
    const { accessibilitySettings } = useSettings();
    const { openLinksInModal } = accessibilitySettings;
    const { handleCardClick } = useCardInteraction({ link: job.link, title: job.orgao, openInModal: openLinksInModal });
    const [copied, setCopied] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const optimizedLogoUrl = useMemo(() => {
        if (!job.logoPath) return null;
        
        // Defensivo: Remove o prefixo 'public/' se existir, para compatibilidade com dados antigos.
        const path = job.logoPath.startsWith('public/') ? job.logoPath.substring(7) : job.logoPath;

        const { data } = supabase.storage.from('logos').getPublicUrl(path, {
            transform: {
                width: 100,
                height: 100,
                quality: 75,
            }
        });
        return data.publicUrl;
    }, [job.logoPath]);

    useEffect(() => {
        if (!openLinksInModal || !cardRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    prefetchUrl(job.link);
                    observer.unobserve(entry.target);
                }
            },
            {
                rootMargin: '200px', // Pré-carrega o conteúdo quando está perto da viewport
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
    }, [job.link, openLinksInModal]);

    const handleOpenRoute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (cidadeRota) {
            openModal('routeMap', { job, userCep: cidadeRota });
        } else {
            openModal('cepInput', { job });
        }
    }, [cidadeRota, openModal, job]);

    const handleShareClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setCopied(false); // Reset copy confirmation state

        const shareData = {
            title: `Vaga de concurso: ${job.orgao}`,
            text: `Confira esta oportunidade: ${job.titulo}.`,
            url: job.link,
        };

        try {
            // Use the Web Share API if available
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for desktop or browsers without share API
                throw new Error('Web Share API not available.');
            }
        } catch (error) {
            console.log('Falha ao compartilhar, usando copiar para a área de transferência:', error);
            // Fallback to clipboard
            const success = await copyToClipboard(job.link);
            if (success) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    }, [job.link, job.orgao, job.titulo]);
    
    const shouldShowLocationPill = (showLocationPillForStateJobs || (job.mentionedStates && job.mentionedStates.length > 0)) && job.mentionedStates && job.mentionedStates.length > 0;
    
    const distanceText = job.distance ? `${job.distance.toFixed(0)} km` : null;
    
    const educationText = useMemo(() =>
        job.educationLevels.length > 0
            ? job.educationLevels.map(level => level.replace('Nível ', '')).join(' / ')
            : null,
    [job.educationLevels]);

    const deadlineText = job.prazoInscricaoFormatado;

    return (
        <div ref={cardRef} onClick={handleCardClick} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleCardClick(e)} role="button" tabIndex={0} 
            title={openLinksInModal ? "Ctrl+clique para abrir em nova aba" : "Ctrl+clique para abrir na janela"}
            className="relative group flex flex-col h-full bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20 p-5 hover:border-indigo-500/50 dark:hover:border-indigo-500/80 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-indigo-500">
            
            <div className="flex items-start gap-4">
                {optimizedLogoUrl ? (
                    <div className="flex-shrink-0 w-14 h-14 bg-white rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-200 p-1 overflow-hidden">
                        <img src={optimizedLogoUrl} alt={`Logo de ${job.orgao}`} className="max-w-full max-h-full object-contain text-xs text-center text-gray-400" loading="lazy" />
                    </div>
                ) : (
                    <div className="flex-shrink-0 w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 p-1">
                        <span className="text-xs text-center text-gray-400 dark:text-gray-500 font-semibold">Logo</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight" title={job.orgao}>{job.orgao}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1" title={job.titulo}>{job.titulo}</p>
                </div>
                <div className="flex-shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors ctrl-key-icon" title="Ver Edital" aria-hidden="true">
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
            
            <div className="flex-grow"></div>
            
            <div className="mt-4 flex flex-wrap gap-2 items-center">
                {job.localidade.toUpperCase() === 'NACIONAL' ? (
                    <InfoPill icon={detailIconMap.neighbors} text="Nacional" pillType="location" />
                ) : (
                    shouldShowLocationPill && job.mentionedStates?.map(state => <InfoPill key={state} icon={detailIconMap.neighbors} text={state} pillType="location" />)
                )}
                {distanceText && <InfoPill icon={<CompassIcon className="h-4 w-4" />} text={distanceText} pillType="distance" />}
                <InfoPill icon={detailIconMap.salary} text={job.parsedSalary} pillType="salary" />
                <InfoPill icon={detailIconMap.vacancies} text={job.parsedVacancies} pillType="vacancies" />
                <InfoPill icon={detailIconMap.education} text={educationText} pillType="education" />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-500 dark:text-rose-400 flex-shrink-0 min-w-0" title={deadlineText || 'Prazo não informado'}>
                    <CalendarIcon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{deadlineText || 'Prazo não informado'}</span>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0 -mr-1.5">
                    {job.cidadeEfetiva && job.localidade.toUpperCase() !== 'NACIONAL' && (
                        <button onClick={handleOpenRoute} aria-label="Ver rota no mapa" title="Ver rota no mapa" className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <RouteIcon className="h-5 w-5"/>
                        </button>
                    )}
                    <button onClick={handleShareClick} aria-label={copied ? "Link copiado!" : "Compartilhar"} title={copied ? "Link copiado!" : "Compartilhar"} className={`p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${copied ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        {copied ? <CheckIcon className="h-5 w-5" /> : <ShareIcon className="h-5 w-5"/>}
                    </button>
                </div>
            </div>
        </div>
    );
});