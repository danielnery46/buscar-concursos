import React, { useState, useEffect } from 'react';
import { ProcessedJob } from '../../types';
import { LocationIcon, RouteIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper para obter uma cidade e estado limpos para consultas de mapa.
const getMapDestination = (job: ProcessedJob): string => {
    // Regex para remover prefixos institucionais como "Prefeitura de"
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
    // Prioridade 1: Usar a cidade efetiva limpa
    if (job.cidadeEfetiva) {
        destinationCity = cleanCityForRouting(job.cidadeEfetiva);
    } 
    // Prioridade 2: Fallback para limpar a localidade
    else {
        destinationCity = cleanCityForRouting(job.localidade.split(',')[0]);
    }

    let state = '';
    // Tenta obter o estado de mentionedStates primeiro
    if (job.mentionedStates && job.mentionedStates.length > 0) {
        state = job.mentionedStates[0];
    } 
    // Fallback para extrair da string de localidade
    else {
        const parts = job.localidade.split(/[\/\-]/);
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart.length === 2 && /^[A-Z]{2}$/i.test(lastPart)) {
                state = lastPart;
            }
        }
    }
    
    // Verificação final para evitar enviar apenas "Prefeitura" ou similar se a limpeza falhar.
    if (['prefeitura', 'camara', 'câmara'].includes(destinationCity.toLowerCase())) {
        // Se a limpeza resultou em um termo genérico, a localidade pode ser melhor.
        const cleanedLocalidade = cleanCityForRouting(job.localidade.split(/[\/\-,]/)[0]);
        if (cleanedLocalidade) {
            destinationCity = cleanedLocalidade;
        }
    }

    return state ? `${destinationCity}, ${state}` : destinationCity;
};


interface BaseMapModalProps extends ModalProps {
    modalId: string;
    headerIcon: React.ReactNode;
    headerTitle: React.ReactNode;
    mapSrc: string;
    mapTitle: string;
    externalLink: string;
    externalLinkText: string;
    externalLinkIcon: React.ReactNode;
}

const BaseMapModal: React.FC<BaseMapModalProps> = ({
    isOpen, onClose, modalId, headerIcon, headerTitle, mapSrc, mapTitle, externalLink, externalLinkText, externalLinkIcon
}) => {
    const [isMapLoading, setIsMapLoading] = useState(true);

    useEffect(() => {
        if (isOpen) setIsMapLoading(true);
    }, [isOpen]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy={modalId}>
            {({ showContent, modalRef }) => (
                <ContentModalLayout
                    showContent={showContent}
                    modalRef={modalRef}
                    onClose={onClose}
                    headerIcon={headerIcon}
                    headerTitle={headerTitle}
                    containerClasses="max-w-3xl h-[80vh]"
                >
                    <div className="relative flex-1 bg-gray-200 dark:bg-gray-800">
                        {isMapLoading && (
                            <div className="absolute inset-0 flex items-center justify-center" aria-label="Carregando mapa">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                            </div>
                        )}
                        <iframe
                            loading="lazy"
                            width="100%" height="100%" src={mapSrc} title={mapTitle}
                            onLoad={() => setIsMapLoading(false)}
                            className={`dark:filter dark:invert-[100%] dark:hue-rotate-180 transition-opacity duration-300 border-none ${isMapLoading ? 'opacity-0' : 'opacity-100'}`}
                        ></iframe>
                    </div>
                    <footer className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                        <a href={externalLink} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-[1.02] active:scale-95">
                            {externalLinkIcon}
                            {externalLinkText}
                        </a>
                    </footer>
                </ContentModalLayout>
            )}
        </ModalBase>
    );
};

interface MapModalProps extends ModalProps {
    job: ProcessedJob | null;
}

export function MapModal({ isOpen, onClose, job }: MapModalProps) {
    if (!job) return null;

    const destination = encodeURIComponent(getMapDestination(job));
    
    return (
        <BaseMapModal
            isOpen={isOpen}
            onClose={onClose}
            modalId="map-modal-title"
            headerIcon={<LocationIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
            headerTitle={
                <div>
                    <h2 id="map-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">{job.orgao}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{job.cidadeEfetiva || job.localidade}</p>
                </div>
            }
            mapSrc={`https://maps.google.com/maps?q=${destination}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            mapTitle={`Mapa para ${job.orgao}`}
            externalLink={`https://www.google.com/maps/search/?api=1&query=${destination}`}
            externalLinkText="Abrir no Google Maps"
            externalLinkIcon={<LocationIcon className="h-5 w-5 mr-2" />}
        />
    );
}

interface RouteMapModalProps extends ModalProps {
    job: ProcessedJob | null;
    userCep?: string | null;
}

export function RouteMapModal({ isOpen, onClose, job, userCep }: RouteMapModalProps) {
    if (!job || !userCep) return null;

    const origin = encodeURIComponent(userCep);
    const destination = encodeURIComponent(getMapDestination(job));

    return (
        <BaseMapModal
            isOpen={isOpen}
            onClose={onClose}
            modalId="route-map-modal-title"
            headerIcon={<RouteIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
            headerTitle={
                <div>
                    <h2 id="route-map-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Rota para {job.orgao}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{job.cidadeEfetiva || job.localidade}</p>
                </div>
            }
            mapSrc={`https://maps.google.com/maps?saddr=${origin}&daddr=${destination}&output=embed`}
            mapTitle={`Rota para ${job.orgao}`}
            externalLink={`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`}
            externalLinkText="Abrir no Google Maps"
            externalLinkIcon={<LocationIcon className="h-5 w-5 mr-2" />}
        />
    );
}
