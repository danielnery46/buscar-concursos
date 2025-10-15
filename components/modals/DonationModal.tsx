import { useState, useEffect } from 'react';
import { copyToClipboard } from '../../utils/helpers';
import {
    AlertTriangleIcon,
    CheckIcon,
    CoffeeIcon,
    CopyIcon
} from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PIX_KEY = '00020126890014BR.GOV.BCB.PIX013681f3185b-529a-4cb5-8f0f-f085566389480227Contribuição para o projeto5204000053039865802BR5925Daniel Nery Frangilo Paiv6009SAO PAULO62140510grIBjXWuFO63041782';
const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PIX_KEY)}`;

/**
 * Modal para doações ao projeto via QR code PIX e chave copia e cola.
 */
export function DonationModal({ isOpen, onClose }: ModalProps) {
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState(false);
    const [isQrLoading, setIsQrLoading] = useState(true);
    
    useEffect(() => {
        if (isOpen) {
            setIsQrLoading(true);
        }
    }, [isOpen]);

    const handleCopy = async () => {
      setCopied(false);
      setCopyError(false);
      const success = await copyToClipboard(PIX_KEY);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 2500);
      }
    };

    const copyButtonClasses = "absolute inset-y-1 right-1 flex items-center justify-center w-20 px-2 py-1 text-sm font-semibold rounded text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900";
    const successClasses = "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500";
    const errorClasses = "bg-red-600 hover:bg-red-700 focus:ring-red-500";
    const defaultClasses = "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy="donation-modal-title">
            {({ showContent, modalRef }) => (
                <ContentModalLayout
                    showContent={showContent}
                    modalRef={modalRef}
                    onClose={onClose}
                    headerIcon={<CoffeeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                    headerTitle={<h2 id="donation-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Apoie o projeto</h2>}
                    containerClasses="max-w-md"
                >
                    <main className="p-4 sm:p-6">
                        <p className="text-base text-gray-600 dark:text-gray-400 mb-6 text-justify hyphens-auto">Se esta ferramenta foi útil para você, considere fazer uma doação de qualquer valor para ajudar a manter o projeto no ar.</p>
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 border-2 border-indigo-500 bg-white rounded-lg w-[232px] h-[232px] flex items-center justify-center relative">
                                {isQrLoading && <div className="absolute inset-0 flex items-center justify-center" aria-label="Carregando QR Code"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>}
                                <img src={qrCodeImageUrl} alt="PIX QR Code para doação" width="200" height="200" className={`transition-opacity duration-300 ${isQrLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsQrLoading(false)} onError={() => setIsQrLoading(false)} />
                            </div>
                            <div className="w-full max-w-sm p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-center">
                                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Confirme os dados do PIX:</p>
                                <p className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">Daniel Nery Frangilo Paiva</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Instituição: Nubank</p>
                            </div>
                        </div>
                    </main>
                    <footer className="p-4 sm:p-5 bg-gray-50 dark:bg-black/50 border-t border-gray-200 dark:border-gray-800">
                        <label htmlFor="pix-key" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2 text-center">Ou use a chave PIX Copia e Cola:</label>
                        <div className="relative">
                            <input id="pix-key" type="text" readOnly value={PIX_KEY} className="w-full bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 pr-20 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none" />
                            <button
                                onClick={handleCopy}
                                className={`${copyButtonClasses} ${copied ? successClasses : copyError ? errorClasses : defaultClasses}`}
                            >
                                {copied ? <CheckIcon className="h-5 w-5" /> : (copyError ? <AlertTriangleIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />)}
                                <span className="ml-1.5">{copied ? 'Copiado!' : (copyError ? 'Erro!' : 'Copiar')}</span>
                            </button>
                        </div>
                    </footer>
                </ContentModalLayout>
            )}
        </ModalBase>
    );
};