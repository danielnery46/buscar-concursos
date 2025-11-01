import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ProcessedJob } from '../../types';
import { LocationIcon, CheckIcon, CloseIcon, ExternalLinkIcon, ShareIcon } from '../Icons';
import { useUserData } from '../../contexts/UserDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { copyToClipboard } from '../../utils/helpers';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const getMapDestination = (job: ProcessedJob): string => {
    const cleanCityForRouting = (city: string | null | undefined): string => {
        if (!city) return '';
        const cityMatch = city.trim().match(
            /^(?:prefeitura|câmara|câmara municipal|saae|fundação|instituto|universidade)(?: municipal)?\s+(?:de\s+)?(.+)/i
        );
        if (cityMatch && cityMatch[1]) {
            return cityMatch[1].trim();
        }
        return city.trim();
    };

    let destinationCity = '';
    if (job.cidadeEfetiva) {
        destinationCity = cleanCityForRouting(job.cidadeEfetiva);
    } 
    else {
        destinationCity = cleanCityForRouting(job.localidade.split(',')[0]);
    }

    let state = '';
    if (job.mentionedStates && job.mentionedStates.length > 0) {
        state = job.mentionedStates[0];
    } 
    else {
        const parts = job.localidade.split(/[\/\-]/);
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart.length === 2 && /^[A-Z]{2}$/i.test(lastPart)) {
                state = lastPart;
            }
        }
    }
    
    if (['prefeitura', 'camara', 'câmara'].includes(destinationCity.toLowerCase())) {
        const cleanedLocalidade = cleanCityForRouting(job.localidade.split(/[\/\-,]/)[0]);
        if (cleanedLocalidade) {
            destinationCity = cleanedLocalidade;
        }
    }

    return state ? `${destinationCity}, ${state}` : destinationCity;
};

const MAP_ANIMATION_DURATION = 300;
const MAP_BUFFER_DELAY = 50;

interface FullScreenMapLayoutProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    urlForShare: string;
    titleForShare: string;
    mapSrc: string;
    externalLink: string;
    topContent?: React.ReactNode;
}

const FullScreenMapLayout: React.FC<FullScreenMapLayoutProps> = ({ isOpen, onClose, title, urlForShare, titleForShare, mapSrc, externalLink, topContent }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [copied, setCopied] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useFocusTrap(isRendered, modalRef, onClose);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setIsRendered(true);
            document.body.style.overflow = 'hidden';
            const openTimer = setTimeout(() => setIsActive(true), 10);
            return () => clearTimeout(openTimer);
        } else if (isRendered) {
            setIsClosing(true);
            const slideOutTimer = setTimeout(() => {
                setIsActive(false);
            }, MAP_BUFFER_DELAY);
            const unmountTimer = setTimeout(() => {
                setIsRendered(false);
                document.body.style.overflow = 'unset';
            }, MAP_ANIMATION_DURATION + MAP_BUFFER_DELAY);
            return () => {
                clearTimeout(slideOutTimer);
                clearTimeout(unmountTimer);
            };
        }
    }, [isOpen, isRendered]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleShare = useCallback(async () => {
        if (!urlForShare) return;
        setCopied(false);

        const shareData = {
            title: titleForShare,
            text: `Confira este link: ${titleForShare}`,
            url: urlForShare,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                throw new Error('Web Share API not available.');
            }
        } catch (error) {
            const success = await copyToClipboard(urlForShare);
            if (success) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            }
        }
    }, [urlForShare, titleForShare]);

    if (!isRendered) return null;

    return (
        <div
            ref={modalRef}
            tabIndex={-1}
            className={`fixed inset-0 bg-slate-100 dark:bg-gray-950 z-50 transition-transform duration-300 ease-out ${isActive ? 'translate-y-0' : 'translate-y-full'}`}
            role="dialog"
            aria-modal="true"
            aria-label={titleForShare}
        >
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-20 flex items-center justify-between px-4 sm:px-6">
                <div className="flex-1 min-w-0 mr-4">{title}</div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Compartilhar">
                        {copied ? <CheckIcon className="h-6 w-6 text-emerald-500" /> : <ShareIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />}
                    </Button>
                    <a href={externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" aria-label="Abrir em nova aba">
                        <ExternalLinkIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </a>
                    <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Fechar">
                        <CloseIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </Button>
                </div>
            </header>
            <main className={`relative h-full pt-16 bg-slate-100 dark:bg-gray-950 overflow-hidden flex flex-col`}>
                {topContent}
                <div className="relative flex-1 bg-gray-200 dark:bg-gray-800">
                    <div className="w-full h-full relative">
                        <iframe
                            loading="lazy"
                            width="100%" height="100%" src={mapSrc} title={titleForShare}
                            className={`dark:filter dark:invert-[100%] dark:hue-rotate-180 transition-opacity duration-300 border-none`}
                        ></iframe>
                        <div className={`absolute inset-0 bg-slate-100 dark:bg-gray-950 pointer-events-none ${isClosing ? 'opacity-100' : 'opacity-0'}`}></div>
                    </div>
                </div>
            </main>
        </div>
    );
};

interface CepInputSectionProps {
    onTraceRoute: (cep: string) => void;
    isLoggedIn: boolean;
}

const CepInputSection: React.FC<CepInputSectionProps> = ({ onTraceRoute, isLoggedIn }) => {
    const [cepInput, setCepInput] = useState('');
    const [cepError, setCepError] = useState('');

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
        setCepInput(value);
        if (cepError) setCepError('');
    };

    const handleTraceClick = () => {
        if (cepInput.replace(/\D/g, '').length !== 8) {
            setCepError('Por favor, insira um CEP válido com 8 dígitos.');
            return;
        }
        onTraceRoute(cepInput);
    };

    const description = isLoggedIn 
        ? "Seu CEP será salvo na sua conta para futuras consultas."
        : "Seu CEP será salvo apenas neste navegador.";

    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <Input
                        type="text"
                        value={cepInput}
                        onChange={handleCepChange}
                        icon={<LocationIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
                        className={cepError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                        placeholder="Insira seu CEP de partida"
                        maxLength={9}
                    />
                    {cepError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{cepError}</p>}
                </div>
                <Button onClick={handleTraceClick}>Traçar Rota</Button>
            </div>
        </div>
    );
};


interface MapModalProps extends ModalProps {
    job: ProcessedJob | null;
}

export function MapModal({ isOpen, onClose, job }: MapModalProps) {
    if (!job) return null;

    const destination = encodeURIComponent(getMapDestination(job));
    
    // --- URLs RESTAURADAS ---
    // Esta é a URL original que estava funcionando para *pontos únicos*.
    const mapSrc = `https://maps.google.com/maps?q=${destination}&t=&ie=UTF8&iwloc=&output=embed`;
    const externalLink = `https://www.google.com/maps/search/?api=1&query=${destination}`;

    const headerTitle = (
        <div>
            <h2 id="map-modal-title" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{job.orgao}</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{job.cidadeEfetiva || job.localidade}</p>
        </div>
    );

    return (
        <FullScreenMapLayout
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            urlForShare={job.link}
            titleForShare={`Localização: ${job.orgao}`}
            mapSrc={mapSrc}
            externalLink={externalLink}
        />
    );
}

interface RouteMapModalProps extends ModalProps {
    job: ProcessedJob | null;
    userCep: string | null;
    filteredCity: string | null;
    filteredState: string | null;
}

export function RouteMapModal({ isOpen, onClose, job, userCep, filteredCity, filteredState }: RouteMapModalProps) {
    const { setCidadeRota } = useUserData();
    const { user } = useAuth();
    
    const [originType, setOriginType] = useState<'user' | 'filter' | 'none'>('none');
    const [currentUserCep, setCurrentUserCep] = useState(userCep || '');

    const destination = useMemo(() => job ? encodeURIComponent(getMapDestination(job)) : '', [job]);

    useEffect(() => {
        if (!isOpen) return;

        setCurrentUserCep(userCep || '');

        if (userCep) {
            setOriginType('user');
        } else if (filteredCity) {
            setOriginType('filter');
        } else {
            setOriginType('none');
        }
    }, [isOpen, userCep, filteredCity]);

    const { mapSrc, externalLink, headerTitleText } = useMemo(() => {
        // --- CORREÇÃO APLICADA AQUI ---
        // 'baseEmbedParams' agora NÃO tem '&iwloc='
        // Isso permite que o Google Maps auto-ajuste o zoom para mostrar a rota inteira.
        const baseEmbedParams = 'output=embed&t=&ie=UTF8'; 
        
        // URLs externas e de embed restauradas para o formato original (com os números)
        const baseExternal = 'https://www.google.com/maps/';
        
        // URL para ponto único (sem origem)
        let src = `https://maps.google.com/maps?${baseEmbedParams}&q=${destination}`;
        let link = `${baseExternal}search/?api=1&query=${destination}`;
        let title = `Localização: ${job?.orgao || ''}`;

        const origin = (originType === 'user' && currentUserCep)
            ? encodeURIComponent(currentUserCep)
            : (originType === 'filter' && filteredCity && filteredState)
            ? encodeURIComponent(`${filteredCity}, ${filteredState}`)
            : null;

        if (origin) {
            // URL para ROTA (com origem e destino)
            // Esta URL agora usará o auto-zoom correto no mobile.
            src = `https://maps.google.com/maps?${baseEmbedParams}&saddr=${origin}&daddr=${destination}`;
            link = `${baseExternal}dir/?api=1&origin=${origin}&destination=${destination}`;
            title = `Rota para ${job?.orgao || ''}`;
        }
        
        return { mapSrc: src, externalLink: link, headerTitleText: title };
    }, [originType, currentUserCep, filteredCity, filteredState, destination, job]);
    
    const handleTraceFromCep = useCallback((newCep: string) => {
        setCidadeRota(newCep);
        setCurrentUserCep(newCep);
        setOriginType('user');
    }, [setCidadeRota]);

    if (!job) return null;
    
    const showOriginTabs = !!currentUserCep && !!filteredCity;
    const showCepInput = !currentUserCep;

    const topContent = (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            {showOriginTabs ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Traçar rota de:</span>
                    <Button size="sm" variant={originType === 'user' ? 'primary' : 'secondary'} onClick={() => setOriginType('user')}>Minha Localização</Button>
                    <Button size="sm" variant={originType === 'filter' ? 'primary' : 'secondary'} onClick={() => setOriginType('filter')}>Cidade do Filtro</Button>
                </div>
            ) : showCepInput ? (
                <CepInputSection onTraceRoute={handleTraceFromCep} isLoggedIn={!!user} />
            ) : (
                 <p className="text-sm text-gray-600 dark:text-gray-400">Exibindo rota de sua localização salva.</p>
            )}
        </div>
    );

    const headerTitle = (
        <div>
            <h2 id="route-map-modal-title" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{headerTitleText}</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{job.cidadeEfetiva || job.localidade}</p>
        </div>
    );

    return (
        <FullScreenMapLayout
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            urlForShare={job.link}
            titleForShare={`Rota para: ${job.orgao}`}
            mapSrc={mapSrc}
            externalLink={externalLink}
            topContent={topContent}
        />
    );
}