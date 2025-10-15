import { useState, useEffect, useCallback } from 'react';
import { PredictedCriteria } from '../../types';
import { defaultPredictedValues } from '../../constants';
import { PredictedNewsFormContent } from '../FormContents';
import { SaveIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';
import { Button } from '../ui/Button';

const MODAL_TRANSITION_DURATION = 200;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DefaultPredictedNewsModalProps extends ModalProps {
    onSave: (criteria: PredictedCriteria) => void;
    title: string;
    description: string;
}

export function DefaultPredictedNewsModal({ isOpen, onClose, onSave, title, description }: DefaultPredictedNewsModalProps) {
    const [criteria, setCriteria] = useState<PredictedCriteria>(defaultPredictedValues);

    const handleSubmit = useCallback(() => {
        onSave(criteria);
        onClose();
    }, [criteria, onSave, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setCriteria(defaultPredictedValues);
            }, MODAL_TRANSITION_DURATION);
        }
    }, [isOpen]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy="default-predicted-modal-title">
            {({ showContent, modalRef }) => (
                <ContentModalLayout
                    showContent={showContent}
                    modalRef={modalRef}
                    onClose={onClose}
                    headerIcon={<SaveIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                    headerTitle={<h2 id="default-predicted-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>}
                    containerClasses="max-w-lg max-h-[85vh]"
                >
                    <main className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-base text-gray-600 dark:text-gray-400 text-justify hyphens-auto mb-4">{description}</p>
                        <div className="space-y-3">
                            <PredictedNewsFormContent
                                criteria={criteria}
                                onCriteriaChange={setCriteria}
                                isModalView={true}
                            />
                        </div>
                    </main>
                    <footer className="px-6 pb-6 pt-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                        <Button onClick={handleSubmit} className="w-full">
                            <SaveIcon className="h-5 w-5 mr-2" />
                            Salvar Filtro Padrão
                        </Button>
                    </footer>
                </ContentModalLayout>
            )}
        </ModalBase>
    );
};