import React, { useState, memo } from 'react';
import {
    HelpCircleIcon,
    StarIcon,
    AtSignIcon,
    GitHubIcon,
    SendIcon,
    InfoIcon,
    CoffeeIcon,
    BellIcon,
    UserIcon,
    BriefcaseIcon,
    WrenchIcon,
    FilterIcon,
} from './Icons';
import { useModal } from '../contexts/ModalContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Accordion } from './ui/Accordion';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Textarea } from './ui/Textarea';

const faqItems = [
    { id: 'organizacao', title: "Como o aplicativo é organizado?", icon: <HelpCircleIcon className="h-6 w-6" />, content: <p>A navegação principal, no topo da página, é dividida em três seções: <strong>Abertos</strong> (concursos e processos seletivos com inscrições abertas), <strong>Previstos</strong> (certames autorizados ou anunciados) e <strong>Notícias</strong> (as últimas novidades sobre concursos).</p> },
    { id: 'diferenca', title: "Qual a diferença entre 'Concursos' e 'Processos Seletivos'?", icon: <BriefcaseIcon className="h-6 w-6" />, content: <p>Na aba 'Abertos', separamos os resultados em duas categorias. <strong>Concursos Públicos</strong> geralmente oferecem vagas para cargos efetivos com estabilidade. <strong>Processos Seletivos</strong> costumam ser para vagas temporárias, de emergência ou para cadastro de reserva.</p> },
{ id: 'filtros', title: "Como funcionam os filtros e buscas salvas?", icon: <StarIcon className="h-6 w-6" />, content: <><p>Em cada seção, clique no ícone de filtro (<FilterIcon className="inline h-4 w-4" />) no canto superior direito para abrir o painel de busca avançada.</p><ul className="list-disc pl-5 mt-2 space-y-1"><li><strong>Favoritos:</strong> Salve uma combinação de filtros para aplicá-la rapidamente mais tarde.</li><li><strong>Padrão:</strong> Defina uma busca como padrão para que ela seja carregada automaticamente em certas áreas da aplicação.</li></ul></> },
{ id: 'conta', title: "Para que serve a seção de Conta?", icon: <UserIcon className="h-6 w-6" />, content: <p>Ao criar uma conta gratuita, você pode salvar seus filtros favoritos, buscas padrão e configurações de acessibilidade na nuvem. Isso permite que suas preferências sejam sincronizadas e acessíveis em qualquer dispositivo onde você fizer login.</p> },
{ id: 'dados', title: "De onde vêm os dados e com que frequência são atualizados?", icon: <InfoIcon className="h-6 w-6" />, content: <p>Nossos dados são extraídos de fontes públicas, principalmente do PCI Concursos e Folha Dirigida (QConcursos). O sistema é atualizado automaticamente várias vezes ao dia para garantir que você tenha as informações mais recentes. O código-fonte do nosso extrator de dados é aberto e está disponível em nosso repositório no GitHub.</p> },
{ id: 'bug', title: "Encontrei um bug ou tenho uma sugestão, o que faço?", icon: <WrenchIcon className="h-6 w-6" />, content: <p>Ficamos felizes em ouvir sua opinião! Role até a seção <strong>"Fale Conosco"</strong> nesta página e preencha o formulário. Sua contribuição é fundamental para melhorarmos a ferramenta.</p> }
];

const ActionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    href?: string;
}> = memo(({ title, description, icon, onClick, href }) => {
    const commonClasses = `block w-full text-left p-6 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 focus-visible:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-1`;

    const content = (
        <>
        <div className="flex items-center gap-4">
        <div className="flex-shrink-0">{icon}</div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
        </div>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400 text-justify hyphens-auto">{description}</p>
        </>
    );

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={commonClasses}>
            {content}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={commonClasses}>
        {content}
        </button>
    );
});

const SupportPage: React.FC = memo(() => {
    const { openModal } = useModal();
    const [formState, setFormState] = useState({ name: '', email: '', subject: 'Sugestão', message: '' });
    const [formStatus, setFormStatus] = useState<'idle' | 'error' | 'success'>('idle');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormStatus('idle');
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('idle');

        if (!formState.name || !formState.email.includes('@') || !formState.message) {
            setFormStatus('error');
            return;
        }

        const subject = encodeURIComponent(`[Buscar Concursos] Contato sobre: ${formState.subject}`);
        const bodyContent = `
        Olá, equipe do Buscar Concursos,

        Estou entrando em contato através do formulário do site.
        Seguem meus dados e minha mensagem:

        ================================
        INFORMAÇÕES DO REMETENTE
        --------------------------------
        - Nome: ${formState.name}
        - E-mail: ${formState.email}
        - Assunto: ${formState.subject}
        ================================

        MENSAGEM:
        --------------------------------
        ${formState.message}

        --------------------------------
        Esta mensagem foi pré-formatada pelo formulário de contato do site.
        `.trim();

        const body = encodeURIComponent(bodyContent);
        window.location.href = `mailto:suporte@buscarconcursos.com.br?subject=${subject}&body=${body}`;

        setFormStatus('success');
        setTimeout(() => {
            setFormState({ name: '', email: '', subject: 'Sugestão', message: '' });
            setFormStatus('idle');
        }, 4000);
    };


    return (
        <div className="max-w-7xl mx-auto w-full fade-in pb-8 space-y-8">
        <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">Central de Ajuda & Suporte</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Tudo o que você precisa saber para aproveitar ao máximo o Buscar Concursos.</p>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard title="Apoie o Projeto" description="Sua doação nos ajuda a manter a plataforma no ar e em constante evolução." icon={<CoffeeIcon className="h-8 w-8 text-amber-500 dark:text-amber-400" />} onClick={() => openModal('donation', {})} />
        <ActionCard title="Notas da Versão" description="Veja o que há de novo, incluindo melhorias e correções de bugs." icon={<BellIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />} onClick={() => openModal('changelog', {})} />
        <ActionCard title="Código Aberto" description="Explore nosso código-fonte, contribua ou reporte problemas no GitHub." icon={<GitHubIcon className="h-8 w-8 text-gray-800 dark:text-gray-200" />} href="https://github.com/danielnery46/buscar-concursos" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
        <Card>
        <CardHeader className="flex flex-col items-center gap-2 text-center">
        <HelpCircleIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        <CardTitle className="text-xl sm:text-2xl">Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
        <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800/80">
        {faqItems.map(item => (
            <Accordion key={item.id} title={item.title} icon={item.icon} isOpen={openAccordion === item.id} onToggle={() => setOpenAccordion(openAccordion === item.id ? null : item.id)}>
            <div className="pb-4 pl-12 pr-4 text-gray-600 dark:text-gray-400 prose prose-base dark:prose-invert max-w-none text-justify hyphens-auto">{item.content}</div>
            </Accordion>
        ))}
        </div>
        </CardContent>
        </Card>

        <div className="space-y-8">
        <Card>
        <CardHeader className="flex flex-col items-center gap-2 text-center">
        <AtSignIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        <CardTitle className="text-xl sm:text-2xl">Fale Conosco</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6 text-justify hyphens-auto">
        Se não encontrou sua resposta, envie-nos uma mensagem. O formulário abaixo irá preparar um e-mail para ser enviado através do seu aplicativo de e-mail padrão. Se preferir, você também pode entrar em contato diretamente pelo e-mail <a href="mailto:suporte@buscarconcursos.com.br" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">suporte@buscarconcursos.com.br</a>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
        {formStatus === 'error' && <Alert type="error" message="Por favor, preencha todos os campos corretamente." />}
        {formStatus === 'success' && <Alert type="success" message="Seu cliente de e-mail deve abrir em instantes. Obrigado pelo contato!" />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
        <Input type="text" id="name" value={formState.name} onChange={handleInputChange} required title="Por favor, preencha seu nome." />
        </div>
        <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
        <Input type="email" id="email" value={formState.email} onChange={handleInputChange} required title="Por favor, insira um endereço de e-mail válido." />
        </div>
        </div>
        <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assunto</label>
        <Select id="subject" value={formState.subject} onChange={handleInputChange}>
        <option>Sugestão</option><option>Relatar Bug</option><option>Dúvida Geral</option><option>Outro</option>
        </Select>
        </div>
        <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
        <Textarea id="message" value={formState.message} onChange={handleInputChange} required rows={4} title="Por favor, escreva sua mensagem." />
        </div>
        <div className="flex justify-end pt-2">
        <Button type="submit">
        <SendIcon className="h-5 w-5" />
        <span>Abrir no cliente de e-mail</span>
        </Button>
        </div>
        </form>
        </CardContent>
        </Card>
        </div>
        </div>
        </div>
    );
});

export default SupportPage;
