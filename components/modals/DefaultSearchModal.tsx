import { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchCriteria, City } from '../../types';
import { systemDefaultValues } from '../../constants';
import { SearchFormContent } from '../FormContents';
import { SaveIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';
import { Button } from '../ui/Button';

const MODAL_TRANSITION_DURATION = 200;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DefaultSearchModalProps extends ModalProps {
    onSave: (criteria: SearchCriteria) => void;
    isCityDataLoading: boolean;
    cityDataCache: Record<string, City[]>;
}

/**
 * Modal para configurar e salvar os critérios de busca padrão do usuário.
 */
export function DefaultSearchModal({ isOpen, onClose, onSave, isCityDataLoading, cityDataCache }: DefaultSearchModalProps) {
    const [criteria, setCriteria] = useState<SearchCriteria>(systemDefaultValues);
    
    const citiesForSelectedState = useMemo(() => {
        const state = criteria.estado;
        if (state.length === 2 && cityDataCache[state.toUpperCase()]) {
            return [...cityDataCache[state.toUpperCase()]].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [criteria.estado, cityDataCache]);
    
    const handleSubmit = useCallback(() => {
        onSave(criteria);
        onClose();
    }, [criteria, onSave, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setCriteria(systemDefaultValues);
            }, MODAL_TRANSITION_DURATION); // Reseta após a transição de fechamento
        }
    }, [isOpen]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy="default-search-modal-title">
            {({ showContent, modalRef }) => (
                <ContentModalLayout
                    showContent={showContent}
                    modalRef={modalRef}
                    onClose={onClose}
                    headerIcon={<SaveIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                    headerTitle={<h2 id="default-search-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Definir Busca Padrão</h2>}
                    containerClasses="max-w-lg max-h-[85vh]"
                >
                    <main className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-base text-gray-600 dark:text-gray-400 text-justify hyphens-auto mb-4">Configure os filtros abaixo para criar sua busca padrão. Ela será usada ao clicar no card "Vagas na sua Busca Padrão" na página inicial.</p>
                        <div className="space-y-3">
                           <SearchFormContent
                                criteria={criteria}
                                onCriteriaChange={setCriteria}
                                isCityDataLoading={isCityDataLoading}
                                cities={citiesForSelectedState}
                                isModalView={true}
                           />
                        </div>
                    </main>
                    <footer className="px-6 pb-6 pt-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                         <Button onClick={handleSubmit} className="w-full">
                            <SaveIcon className="h-5 w-5 mr-2" />
                            Salvar Busca Padrão
                        </Button>
                    </footer>
                </ContentModalLayout>
            )}
        </ModalBase>
    );
};