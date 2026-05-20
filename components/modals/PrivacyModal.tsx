import React from 'react';
import { ClipboardListIcon, UserIcon, CloudIcon, SunMoonIcon, SlidersIcon, StarIcon, SaveIcon, LocationIcon, WrenchIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DataItem: React.FC<{ icon: React.ReactNode; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1 text-indigo-500 dark:text-indigo-400">{icon}</div>
        <div>
            <h5 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    </div>
);


export function PrivacyModal({ isOpen, onClose }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy="privacy-modal-title">
            {({ showContent, modalRef }) => (
                 <ContentModalLayout
                    showContent={showContent}
                    modalRef={modalRef}
                    onClose={onClose}
                    headerIcon={<ClipboardListIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                    headerTitle={<h2 id="privacy-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Uso de Cookies e Armazenamento Local</h2>}
                    containerClasses="max-w-4xl max-h-[90vh]"
                >
                    <main className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-black/20">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <p className="text-center text-base text-gray-700 dark:text-gray-300">
                                Para oferecer uma experiência personalizada, usamos o armazenamento local do seu navegador (similar a cookies) para salvar suas preferências. Veja como funciona:
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Card para Visitantes */}
                                <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <UserIcon className="h-7 w-7 text-gray-500 dark:text-gray-400" />
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Visitante (sem conta)</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Dados salvos apenas no seu navegador.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-5">
                                        <DataItem
                                            icon={<><SunMoonIcon className="h-6 w-6" /><SlidersIcon className="h-6 w-6 hidden" /></>}
                                            title="Preferências de Aparência"
                                            description="Seu tema (claro/escuro) e ajustes de acessibilidade."
                                        />
                                        <DataItem
                                            icon={<><StarIcon className="h-6 w-6" /><SaveIcon className="h-6 w-6 hidden" /></>}
                                            title="Buscas Salvas"
                                            description="Filtros favoritos e padrão para acesso rápido."
                                        />
                                        <DataItem
                                            icon={<LocationIcon className="h-6 w-6" />}
                                            title="Seu CEP"
                                            description="Usado para calcular distâncias e traçar rotas."
                                        />
                                    </div>
                                </div>

                                {/* Card para Usuários Logados */}
                                <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <CloudIcon className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Usuário (com conta)</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Dados sincronizados na nuvem.</p>
                                        </div>
                                    </div>
                                     <div className="space-y-5">
                                        <DataItem
                                            icon={<><SunMoonIcon className="h-6 w-6" /><SlidersIcon className="h-6 w-6 hidden" /></>}
                                            title="Preferências de Aparência"
                                            description="Sincronizamos suas configurações em todos os seus dispositivos."
                                        />
                                        <DataItem
                                            icon={<><StarIcon className="h-6 w-6" /><SaveIcon className="h-6 w-6 hidden" /></>}
                                            title="Buscas Salvas"
                                            description="Acesse seus filtros favoritos e padrão de qualquer lugar."
                                        />
                                        <DataItem
                                            icon={<LocationIcon className="h-6 w-6" />}
                                            title="Seu CEP"
                                            description="Sincronizado para uma experiência consistente entre dispositivos."
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="!mt-8 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-center border border-gray-200 dark:border-gray-700/80">
                                <WrenchIcon className="h-8 w-8 mx-auto text-gray-500 dark:text-gray-400 mb-2"/>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Você no Controle</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md mx-auto">
                                    Você pode gerenciar, exportar ou apagar todos os seus dados a qualquer momento na página de <strong>Configurações</strong>.
                                </p>
                            </div>
                        </div>
                    </main>
                </ContentModalLayout>
            )}
        </ModalBase>
    );
};