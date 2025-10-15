import React, { useState, useCallback } from 'react';
import {
    ChevronDownIcon,
    CoffeeIcon,
    FilterIcon,
    LogOutIcon,
    SaveIcon,
    StarIcon,
    TabSearchIcon
} from '../Icons';
import { ModalBase, useModalLifecycle } from './ModalBase';
import { Button } from '../ui/Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Um tutorial interativo de múltiplos passos para novos usuários.
 */
export function InteractiveTutorial({ isOpen, onClose }: ModalProps) {
    const [step, setStep] = useState(0);
    const { handleClose } = useModalLifecycle(isOpen, onClose, true);

    const tutorialSteps: Array<{ title: string; description: string; content?: React.ReactNode; }> = [
        { 
            title: "Bem-vindo(a)!", 
            description: "Bem-vindo(a) à nova interface do Buscar Concursos! Vamos conhecer os principais recursos." 
        },
        { 
            title: "1. Navegação Principal", 
            description: "Use o menu no topo da página para navegar entre as seções: 'Abertos', 'Previstos' e 'Notícias'.",
            content: (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/80 flex justify-center items-center">
                    <button
                        disabled
                        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-200/60 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400"
                    >
                        <TabSearchIcon className="h-5 w-5"/>
                        <span className="hidden sm:inline">Abertos</span>
                        <ChevronDownIcon className={`h-5 w-5 text-gray-500 dark:text-gray-400`} />
                    </button>
                </div>
            )
        },
        { 
            title: "2. Filtros Inteligentes", 
            description: "Em cada seção, use o botão de filtro no canto superior direito para abrir um painel lateral com opções de busca avançada.", 
            content: (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/80 flex justify-center items-center">
                     <button
                        disabled
                        className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <FilterIcon className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-white dark:ring-black">
                            3
                        </span>
                    </button>
                </div>
            )
        },
        { 
            title: "3. Salve suas Buscas", 
            description: "No painel de filtros, você pode salvar suas buscas nos 'Favoritos' para acesso rápido ou definir uma busca 'Padrão' para ser aplicada automaticamente.",
            content: (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700/80">
                    <div className="p-1 bg-gray-200 dark:bg-gray-800/50 rounded-xl flex items-center gap-1">
                        <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        >
                            <FilterIcon className="h-5 w-5" />
                        </button>
                        <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg text-gray-500 dark:text-gray-400"
                        >
                            <StarIcon className="h-5 w-5" />
                        </button>
                        <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg text-gray-500 dark:text-gray-400"
                        >
                            <SaveIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )
        },
        {
            title: "4. Crie uma Conta",
            description: "Para uma experiência personalizada, crie uma conta. Com ela, seus filtros e favoritos ficam salvos na nuvem, disponíveis em qualquer dispositivo.",
            content: (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/80">
                    <button
                        disabled
                        className="w-full flex items-center justify-center gap-3 text-left px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <LogOutIcon className="h-5 w-5 -scale-x-100" />
                        <span>Login / Criar Conta</span>
                    </button>
                </div>
            )
        },
        { 
            title: "5. Resultados Detalhados", 
            description: "Na seção 'Abertos', os resultados são divididos entre 'Concursos' e 'Processos Seletivos' para facilitar sua navegação.",
            content: (
                 <div className="mt-4 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                    <nav className="flex flex-wrap gap-1.5" role="tablist">
                        <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        >
                            Concursos
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                                123
                            </span>
                        </button>
                         <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg text-gray-500 dark:text-gray-400"
                        >
                            Processos Seletivos
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300">
                                45
                            </span>
                        </button>
                    </nav>
                </div>
            )
        },
        { 
            title: "6. Mantenha-se Informado", 
            description: "As abas 'Previstos' e 'Notícias' trazem as últimas atualizações sobre concursos autorizados, editais futuros e novidades do setor.",
            content: (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/80">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2">Concurso Nacional Unificado: saem novos editais</p>
                        <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">18/07/2024</span>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">Nacional</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "7. Apoie o Projeto",
            description: "Se o Buscar Concursos for útil para você, considere apoiar o projeto com uma doação. Sua ajuda é fundamental para mantermos o site no ar e em constante evolução.",
            content: (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700/80 flex justify-center items-center gap-4">
                    <CoffeeIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    <p className="font-semibold text-amber-800 dark:text-amber-200">Apoiar com um café</p>
                </div>
            )
        },
        { 
            title: "Tudo pronto!", 
            description: "Agora você já conhece o principal da nova interface. Explore o site e boa sorte na busca pela sua vaga!" 
        }
    ];
    const totalSteps = tutorialSteps.length;

    const handleNext = useCallback(() => {
        if (step < totalSteps - 1) {
            setStep(s => s + 1);
        } else {
            handleClose();
        }
    }, [step, totalSteps, handleClose]);
    
    const handlePrev = useCallback(() => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    }, [step]);
    
    const currentStepData = tutorialSteps[step];
    const progressPercentage = ((step + 1) / totalSteps) * 100;
    
    return (
        <ModalBase isOpen={isOpen} onClose={handleClose} ariaLabelledBy="tutorial-modal-title" disableInitialFocus={true}>
            {({ showContent, modalRef }) => (
                <div 
                    ref={modalRef} 
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-none ring-1 ring-black/5 dark:ring-white/10 w-full max-w-md flex flex-col overflow-hidden transition-all duration-300 ease-out focus:outline-none ${!showContent ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                >
                    <header className="relative p-4 sm:p-5 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700/50">
                        <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-full">
                            <StarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <h2 id="tutorial-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">{currentStepData.title}</h2>
                        </div>
                    </header>
                    <main className="px-5 sm:px-6 pt-4 pb-5">
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed text-justify hyphens-auto">{currentStepData.description}</p>
                        {currentStepData.content}
                    </main>
                    <footer className="px-5 pb-5 pt-2 space-y-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                            <Button variant="link" onClick={handleClose}>Pular</Button>
                            <div className="flex gap-2">
                                {step > 0 && <Button variant="secondary" size="sm" onClick={handlePrev}>Anterior</Button>}
                                <Button size="sm" onClick={handleNext}>{step === totalSteps - 1 ? 'Concluir' : 'Próximo'}</Button>
                            </div>
                        </div>
                    </footer>
                </div>
            )}
        </ModalBase>
    );
};