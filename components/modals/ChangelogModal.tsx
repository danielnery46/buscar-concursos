import { BellIcon } from '../Icons';
import { ModalBase, ContentModalLayout } from './ModalBase';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Modal para exibir o histórico de versões e notas de lançamento.
 */
export function ChangelogModal({ isOpen, onClose }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} ariaLabelledBy="changelog-modal-title">
            {({ showContent, modalRef }) => (
                 <ContentModalLayout
                    showContent={showContent}
                    modalRef={modalRef}
                    onClose={onClose}
                    headerIcon={<BellIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                    headerTitle={<h2 id="changelog-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Notas da versão</h2>}
                    containerClasses="max-w-lg max-h-[85vh]"
                >
                    <main className="p-4 sm:p-6 overflow-y-auto flex-1">
                        <div className="prose prose-base dark:prose-invert max-w-none text-justify hyphens-auto">
                            <div className="not-prose p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-500/30 rounded-lg mb-4">
                                <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-200">Novidades da versão 2.0</h3>
                                <ul className="mt-2 space-y-2 list-disc list-outside pl-5 text-indigo-700 dark:text-indigo-300">
                                    <li><span className="font-semibold">Migração de Dados Locais:</span> Ao fazer login, o sistema agora detecta dados salvos localmente e oferece a opção de migrá-los para sua conta na nuvem.</li>
                                    <li><span className="font-semibold">Otimização do Banco de Dados:</span> Realizamos uma otimização nas consultas ao banco de dados, resultando em buscas mais rápidas e eficientes.</li>
                                    <li><span className="font-semibold">Extração de Dados Aprimorada:</span> Os robôs de extração de dados foram aprimorados para garantir maior precisão e confiabilidade das informações.</li>
                                    <li><span className="font-semibold">Animações Padronizadas:</span> As animações de carregamento foram unificadas em todo o site para uma experiência visual mais coesa.</li>
                                    <li><span className="font-semibold">Menu de Ordenação Reposicionado:</span> A opção para ordenar os resultados foi movida para dentro do painel de "Filtros", centralizando as opções de busca.</li>
                                    <li><span className="font-semibold">Correções Gerais de Bugs:</span> Diversos bugs menores foram corrigidos, melhorando a estabilidade e a experiência de uso da plataforma.</li>
                                </ul>
                            </div>
                            <div className="not-prose p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-500/30 rounded-lg mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novidades da versão 1.9</h3>
                                <ul className="mt-2 space-y-2 list-disc list-outside pl-5 text-gray-700 dark:text-gray-300">
                                    <li><span className="font-semibold">Retrabalho Visual Completo:</span> A interface do site foi completamente modernizada para uma experiência de uso mais agradável e intuitiva.</li>
                                    <li><span className="font-semibold">Sistema de Contas:</span> Agora é possível criar uma conta para salvar seus filtros, buscas favoritas e configurações de acessibilidade na nuvem.</li>
                                    <li><span className="font-semibold">Nova Aba "Previstos":</span> Adicionamos uma nova aba para você acompanhar os concursos que estão previstos para acontecer.</li>
                                    <li><span className="font-semibold">Lançamento no GitHub:</span> O código-fonte do projeto agora está disponível publicamente para a comunidade.</li>
                                    <li><span className="font-semibold">Melhorias no Sistema de Rotas:</span> O recurso de traçar rotas agora está mais inteligente, salvando seu CEP para futuras consultas.</li>
                                    <li><span className="font-semibold">Configurações de Acessibilidade Expandidas:</span> Novas opções foram adicionadas para personalizar a experiência de uso, como fonte para dislexia, destaque de links e mais.</li>
                                    <li><span className="font-semibold">Melhorias no Banco de Dados:</span> O processo de extração de dados foi otimizado, melhorando a performance e a confiabilidade das informações de concursos.</li>
                                    <li><span className="font-semibold">Correções Gerais:</span> Implementadas diversas correções de bugs para melhorar a estabilidade da aplicação.</li>
                                </ul>
                            </div>
                            <div className="not-prose p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-500/30 rounded-lg mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novidades da versão 1.8</h3>
                                <ul className="mt-2 space-y-2 list-disc list-outside pl-5 text-gray-700 dark:text-gray-300">
                                    <li><span className="font-semibold">Tutorial Interativo:</span> Agora, na primeira visita, um tutorial rápido e interativo apresenta as principais funcionalidades do site para ajudar novos usuários.</li>
                                    <li><span className="font-semibold">Filtro de Cidades Aprimorado:</span> O filtro de cidade agora é um menu de seleção (dropdown) que é preenchido automaticamente após a escolha de um estado, tornando a busca mais precisa e fácil.</li>
                                    <li><span className="font-semibold">Aba de Notícias:</span> Adicionamos uma nova aba dedicada às últimas notícias e atualizações do mundo dos concursos.</li>
                                    <li><span className="font-semibold">Filtro de Distância em KM:</span> O filtro de distância foi aprimorado e agora permite a busca por um raio em quilômetros.</li>
                                    <li><span className="font-semibold">Remoção do Visual Compacto:</span> O modo de visualização compacto, presente na v1.7, foi removido para simplificar a interface.</li>
                                    <li><span className="font-semibold">Melhorias e Correções:</span> Realizamos diversas melhorias gerais na interface e correções de bugs em todo o sistema, incluindo otimizações no mecanismo de filtros.</li>
                                </ul>
                            </div>
                            <div className="not-prose p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-500/30 rounded-lg mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novidades da versão 1.7</h3>
                                <ul className="mt-2 space-y-2 list-disc list-outside pl-5 text-gray-700 dark:text-gray-300">
                                    <li><span className="font-semibold">Resumo da Busca:</span> Agora você verá um resumo com os principais dados dos resultados filtrados, como total de vagas e maior salário.</li>
                                    <li><span className="font-semibold">Datas de Inscrição:</span> Os cards dos concursos agora exibem a data limite para as inscrições, quando disponível.</li>
                                    <li><span className="font-semibold">Logos dos Órgãos:</span> Adicionadas imagens e brasões dos órgãos públicos para facilitar a identificação visual.</li>
                                    <li><span className="font-semibold">Melhorias na Interface:</span> Realizadas melhorias gerais na interface, usabilidade e no layout da área de filtros.</li>
                                    <li><span className="font-semibold">Modo Tela Cheia:</span> Adicionado um botão no cabeçalho para expandir a aplicação para tela cheia.</li>
                                    <li><span className="font-semibold">Visual Compacto:</span> Em desktops, agora é possível alternar para um visual de coluna única, similar ao de celulares.</li>
                                    <li><span className="font-semibold">Correções e Otimizações:</span> Realizadas diversas correções de bugs e melhorias de performance em toda a aplicação.</li>
                                </ul>
                            </div>
                            <div className="not-prose p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-500/30 rounded-lg mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novidades da versão 1.6</h3>
                                <ul className="mt-2 space-y-2 list-disc list-outside pl-5 text-gray-700 dark:text-gray-300">
                                    <li><span className="font-semibold">Tamanho da Interface:</span> Adicionada uma opção nas configurações para ajustar o zoom da aplicação, melhorando a visualização em diferentes telas.</li>
                                    <li><span className="font-semibold">Melhorias nos Filtros:</span> Realizadas diversas melhorias e correções no sistema de filtragem para maior precisão, incluindo a lógica de escolaridade e a exibição de resultados para filtros de salário e vagas.</li>
                                    <li><span className="font-semibold">Correção de Exibição:</span> Corrigido um bug onde a informação "Vagas" era exibida indevidamente como salário.</li>
                                </ul>
                            </div>
                        </div>
                    </main>
                </ContentModalLayout>
            )}
        </ModalBase>
    );
};