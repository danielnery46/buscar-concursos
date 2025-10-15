import { useState, useEffect, useCallback } from 'react';
import { copyToClipboard } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { CheckIcon, CloseIcon, ExternalLinkIcon, ShareIcon } from '../Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WEB_CONTENT_ANIMATION_DURATION = 300;
const WEB_CONTENT_BUFFER_DELAY = 50;

interface WebContentModalProps extends ModalProps {
    url?: string;
    title?: string;
}

/**
 * Uma visualização em tela cheia para exibir conteúdo da web, tratando a oscilação de renderização do iframe ao fechar.
 */
export function WebContentModal({ isOpen, onClose, url, title }: WebContentModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setIsRendered(true);
            document.body.style.overflow = 'hidden';
            setIsLoading(true);
            const openTimer = setTimeout(() => setIsActive(true), 10);
            return () => clearTimeout(openTimer);
        } else if (isRendered) {
            // Passo 1: Mostra a sobreposição instantaneamente para cobrir o conteúdo do iframe antes que ele desapareça.
            setIsClosing(true);
            
            // Passo 2: Após um breve atraso para garantir que a sobreposição seja renderizada, inicia a animação de saída.
            const slideOutTimer = setTimeout(() => {
                setIsActive(false);
            }, WEB_CONTENT_BUFFER_DELAY);

            // Passo 3: Após a duração da animação, desmonta o componente.
            const unmountTimer = setTimeout(() => {
                setIsRendered(false);
                document.body.style.overflow = 'unset';
            }, WEB_CONTENT_ANIMATION_DURATION + WEB_CONTENT_BUFFER_DELAY);

            return () => {
                clearTimeout(slideOutTimer);
                clearTimeout(unmountTimer);
            };
        }
    }, [isOpen, isRendered]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleCopy = async () => {
        if (!url) return;
        setCopied(false);
        const success = await copyToClipboard(url);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };
    
    if (!isRendered) return null;

    return (
        <div 
            className={`fixed inset-0 bg-slate-100 dark:bg-gray-950 z-50 transition-transform duration-300 ease-out ${isActive ? 'translate-y-0' : 'translate-y-full'}`}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Visualizador de conteúdo web'}
        >
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-20 flex items-center justify-between px-4 sm:px-6">
                <div className="flex-1 min-w-0 mr-4">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{title}</h2>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 dark:text-gray-400 hover:underline truncate block">
                        {url}
                    </a>}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Compartilhar">
                         {copied ? <CheckIcon className="h-6 w-6 text-emerald-500" /> : <ShareIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />}
                    </Button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" aria-label="Abrir em nova aba">
                        <ExternalLinkIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </a>
                    <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Fechar">
                        <CloseIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </Button>
                </div>
            </header>
            <main className="relative h-full pt-16 bg-slate-100 dark:bg-gray-950 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-gray-950 z-10" aria-label="Carregando conteúdo">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    </div>
                )}
                <div className={`w-full h-full relative transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                    <iframe
                        loading="lazy"
                        src={url}
                        title={title}
                        onLoad={() => setIsLoading(false)}
                        className="w-[calc(100%/0.95)] h-[calc(100%/0.95)] border-none bg-white dark:bg-gray-900 transform scale-95 origin-top-left"
                        sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                    ></iframe>
                    <div 
                        className={`absolute inset-0 bg-slate-100 dark:bg-gray-950 pointer-events-none ${isClosing ? 'opacity-100' : 'opacity-0'}`}
                    ></div>
                </div>
            </main>
        </div>
    );
};