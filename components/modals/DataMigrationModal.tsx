import { SaveIcon, ShareIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';
import { Button } from '../ui/Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DataMigrationModalProps extends ModalProps {
    onMigrate: () => void;
    onDiscard: () => void;
}

/**
 * Modal to ask the user whether to migrate local data to their account or discard it.
 */
export function DataMigrationModal({ isOpen, onMigrate, onDiscard }: DataMigrationModalProps) {
    // Uma função vazia é usada para desabilitar o fechamento via Esc ou clique no backdrop.
    // O usuário é forçado a escolher uma das duas opções.
    const handleForceChoice = () => {};

    return (
        <ModalBase isOpen={isOpen} onClose={handleForceChoice} ariaLabelledBy="migration-modal-title" disableInitialFocus={true}>
            {({ showContent, modalRef }) => (
              <ContentModalLayout
                showContent={showContent}
                modalRef={modalRef}
                onClose={handleForceChoice}
                hideCloseButton={true}
                headerIcon={<ShareIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                headerTitle={<h2 id="migration-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Dados Locais Encontrados</h2>}
                containerClasses="max-w-md"
              >
                <main className="p-4 sm:p-6 space-y-4">
                    <p className="text-base text-gray-600 dark:text-gray-400 text-justify hyphens-auto">
                        Detectamos que você possui dados salvos (favoritos, buscas padrão, configurações, etc.) neste navegador. Deseja movê-los para sua conta ou começar do zero com os dados da nuvem?
                    </p>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-center">
                        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                            <strong>Recomendação:</strong> Se você usou o site antes de criar a conta, migrar garantirá que você não perca nada.
                        </p>
                    </div>
                </main>
                <footer className="px-6 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button onClick={onDiscard} variant="secondary" className="w-full">
                        Descartar Dados Locais
                    </Button>
                    <Button onClick={onMigrate} className="w-full">
                        <SaveIcon className="h-5 w-5 mr-2" />
                        Migrar para a Conta
                    </Button>
                </footer>
              </ContentModalLayout>
            )}
        </ModalBase>
    );
};