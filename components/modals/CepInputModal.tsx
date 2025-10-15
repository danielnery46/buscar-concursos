import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LocationIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const MODAL_TRANSITION_DURATION = 200;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CepInputModalProps extends ModalProps {
    onSave: (cep: string) => void;
}

/**
 * Modal para solicitar o CEP do usuário para calcular rotas de viagem.
 */
export function CepInputModal({ isOpen, onClose, onSave }: CepInputModalProps) {
    const [cep, setCep] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setTimeout(() => {
                setCep('');
                setError('');
            }, MODAL_TRANSITION_DURATION); // Reseta após a transição de fechamento
        }
    }, [isOpen]);

    const handleSubmit = useCallback(() => {
        if (cep.replace(/\D/g, '').length !== 8) {
            setError('Por favor, insira um CEP válido com 8 dígitos.');
            inputRef.current?.focus();
            return;
        }
        onSave(cep);
        onClose();
    }, [cep, onSave, onClose]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    }, [handleSubmit]);

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
      setCep(value);
      if (error) setError('');
    };
    
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy="cep-input-modal-title">
            {({ showContent, modalRef }) => (
              <ContentModalLayout
                showContent={showContent}
                modalRef={modalRef}
                onClose={onClose}
                headerIcon={<LocationIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                headerTitle={<h2 id="cep-input-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Informe seu CEP de Partida</h2>}
                containerClasses="max-w-md"
              >
                <main className="p-4 sm:p-6 space-y-4">
                    <p className="text-base text-gray-600 dark:text-gray-400 text-justify hyphens-auto">Para traçar a rota até o local do concurso, precisamos do seu CEP. Ele será salvo apenas no seu navegador para facilitar futuras consultas.</p>
                    <div>
                        <label htmlFor="cep-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Seu CEP</label>
                        <Input
                            ref={inputRef}
                            type="text"
                            id="cep-input"
                            value={cep}
                            onChange={handleCepChange}
                            onKeyDown={handleKeyDown}
                            icon={<LocationIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
                            className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                            placeholder="00000-000"
                            maxLength={9}
                            aria-invalid={!!error}
                            aria-describedby="cep-error"
                        />
                        {error && <p id="cep-error" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                    </div>
                </main>
                <footer className="px-6 pb-6 pt-2">
                    <Button onClick={handleSubmit} className="w-full">
                        Salvar e Traçar Rota
                    </Button>
                </footer>
              </ContentModalLayout>
            )}
        </ModalBase>
    );
};
