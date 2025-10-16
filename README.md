# Buscar Concursos

[![Licença](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Tecnologias](https://img.shields.io/badge/tecnologias-React%20%7C%20Supabase%20%7C%20Deno-brightgreen)](https://supabase.com)

Uma aplicação web moderna e otimizada para buscar, visualizar e filtrar vagas de concursos públicos abertos, previstos e notícias em todo o Brasil.

---

## 📖 Sobre o Projeto

O **Buscar Concursos** é uma ferramenta completa projetada para centralizar e simplificar o acesso a oportunidades de emprego no setor público brasileiro. A plataforma é dividida em duas partes principais:

*   **🖥️ Frontend (React + Vite):** Uma interface de usuário moderna, responsiva e acessível, construída com **React**, **TypeScript** e **Tailwind CSS**. A aplicação consome dados diretamente da infraestrutura Supabase, garantindo buscas rápidas e eficientes.

*   **⚙️ Infraestrutura & Automação (Supabase):** Utilizamos o Supabase como nosso Backend-as-a-Service, gerenciando:
    *   **Database (PostgreSQL):** Armazena todos os dados de concursos, notícias, previstos e usuários.
    *   **Auth:** Gerencia a autenticação de usuários, permitindo a sincronização de dados na nuvem.
    *   **Storage:** Hospeda logos de órgãos otimizados e arquivos estáticos (como dados de cidades) em uma CDN para performance global.
    *   **Edge Functions (Deno):** Scripts automatizados que mantêm o banco de dados atualizado:
        *   `scraper-concursos`: Extrai vagas de concursos e processos seletivos abertos (Fonte: PCI Concursos).
        *   `scraper-previstos`: Extrai concursos previstos (Fontes: PCI Concursos, QConcursos).
        *   `scraper-noticias`: Extrai as últimas notícias sobre concursos (Fontes: PCI Concursos, QConcursos, JC Concursos).
        *   `delete-user`: Uma função segura para lidar com a exclusão de contas de usuário.

## ✨ Recursos Principais

-   **Busca Abrangente:** Acesse concursos, processos seletivos, certames previstos e notícias em um só lugar.
-   **Filtragem Avançada:** Filtre vagas por localização (região, estado, cidade), raio de distância, nível de escolaridade, salário mínimo, vagas mínimas e palavra-chave.
-   **Contas de Usuário & Sincronização:** Crie uma conta para salvar suas preferências (filtros, favoritos, configurações) e acessá-las de qualquer dispositivo.
-   **Buscas Favoritas & Padrão:** Salve suas combinações de filtros mais usadas como "Favoritos" para acesso rápido ou defina uma "Busca Padrão".
-   **Acessibilidade:** Um conjunto robusto de configurações de acessibilidade, incluindo modo de alto contraste, fonte para dislexia, texto maior e muito mais.
-   **Otimização de Performance:** A arquitetura foi otimizada para reduzir custos de tráfego (Egress) e garantir uma experiência de usuário rápida, com consultas e filtros executados no lado do servidor.

## 🚀 Começando

Para rodar o projeto localmente, você precisará do [Node.js](https://nodejs.org/) (versão 18 ou superior) e do npm instalados.

1.  **Clone o repositório:**
    ```sh
    git clone https://github.com/danielnery46/buscar-concursos.git
    cd buscar-concursos
    ```

2.  **Instale as dependências:**
    ```sh
    npm install
    ```

3.  **Configure o Supabase:** Crie um arquivo chamado `.env` na raiz do projeto. Você pode copiar o `env.txt` como modelo.
    ```sh
    cp env.txt .env
    ```
    Edite o arquivo `.env` com as chaves do seu projeto Supabase, que podem ser encontradas em "Configurações" > "API" no seu painel.

    ```
    VITE_SUPABASE_URL="https://seu-projeto-id.supabase.co"
    VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica"
    ```

4.  **Rode o servidor de desenvolvimento:**
    ```sh
    npm run dev
    ```
    A aplicação estará disponível no endereço indicado no seu terminal (geralmente `http://localhost:5173`).

## ⚙️ Implantação das Edge Functions

Os scripts de scraping estão localizados em `supabase/functions/` e foram projetados para rodar como Supabase Edge Functions.

Para implantá-los, você precisará da [Supabase CLI](https://supabase.com/docs/guides/cli):

1.  **Faça login na CLI:**
    ```sh
    supabase login
    ```

2.  **Vincule seu projeto:**
    ```sh
    supabase link --project-ref seu-projeto-id
    ```

3.  **Implante uma função individualmente:**
    ```sh
    supabase functions deploy scraper-concursos --no-verify-jwt
    ```
    Repita o comando para as outras funções (`scraper-previstos`, `scraper-noticias`, `delete-user`). A flag `--no-verify-jwt` é necessária para as funções de scraping, pois elas podem ser chamadas por um agendador externo (cron job) e não por um usuário autenticado.

4.  **Agendamento:** Após a implantação, você pode agendar a execução periódica das funções usando um serviço de cron job (como o Agendador do Supabase, GitHub Actions ou outro de sua preferência) que faz uma requisição `POST` para o endpoint da função.

## 📁 Estrutura do Projeto

```
/
├── public/                # Ativos estáticos, incluindo dados de cidades.
├── src/
│   ├── components/        # Componentes React reutilizáveis.
│   ├── contexts/          # Provedores de contexto (Auth, Settings, etc.).
│   ├── hooks/             # Hooks customizados para lógica de estado.
│   ├── services/          # Lógica de comunicação com a API (Supabase).
│   ├── utils/             # Funções utilitárias (formatadores, helpers).
│   ├── App.tsx            # Componente raiz da aplicação.
│   └── index.tsx          # Ponto de entrada da aplicação React.
└── supabase/
    └── functions/         # Código-fonte das Edge Functions (scrapers).
```

## 📄 Licença

Este projeto está licenciado sob a Licença Apache 2.0.