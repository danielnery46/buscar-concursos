<h1>Buscar Concursos</h1>
  <p>
    Aplicação web para buscar, visualizar e filtrar vagas de concursos públicos abertos e previstos em todo o Brasil.
  </p>
</div>

## 📖 Sobre o Projeto

Este repositório contém o código-fonte completo do projeto "Buscar Concursos", uma ferramenta para encontrar vagas de concursos públicos no Brasil. O projeto é dividido em duas partes principais:

*   **🖥️ Frontend (React + TypeScript):** Uma interface de usuário moderna e responsiva que permite ao usuário final buscar e filtrar concursos. Os dados são consumidos diretamente de um banco de dados Supabase.

*   **⚙️ Scrapers Automatizados (Supabase Edge Functions):** Três scripts Deno que rodam em servidores da Supabase:
    *   **`scraper-jobs`**: Extrai vagas de concursos e processos seletivos abertos.
    *   **`scraper-predicted`**: Extrai concursos previstos.
    *   **`scraper-news`**: Extrai notícias sobre concursos.
    Todos extraem dados do site PCI Concursos e os salvam em tabelas no banco de dados Supabase.

## 🚀 Começando

Para rodar o projeto localmente, você precisará ter o Node.js (versão 18 ou superior) e o npm instalados em sua máquina.

### Frontend (Aplicação React)

Siga os passos abaixo para rodar a aplicação principal:

1.  **Clone o repositório:**
    ```sh
    git clone https://github.com/danielnery46/buscar-concursos.git
    cd buscar-concursos
    ```
2.  **Instale as dependências:**
    ```sh
    npm install
    ```
3.  **Configure o Supabase:** Copie o arquivo de exemplo `env.txt` para um novo arquivo chamado `.env`.
    ```sh
    cp env.txt .env
    ```
    Em seguida, edite o arquivo `.env` e substitua os valores de placeholder pelas suas chaves reais do Supabase. Você pode obter essas chaves no painel do seu projeto em "Configurações" > "API".

    O conteúdo do seu arquivo `.env` deverá ser parecido com isto:
    ```
    VITE_SUPABASE_URL="https://seu-projeto-id.supabase.co"
    VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica"
    ```

4.  **Rode o servidor de desenvolvimento:**
    ```sh
    npm run dev
    ```
    Abra [http://localhost:4173](http://localhost:4173) (ou o endereço indicado no seu terminal) para ver a aplicação rodando.

## ⚙️ Automação com Supabase Edge Functions

Os scripts de scraping foram projetados para rodar automaticamente como Supabase Edge Functions, garantindo que a aplicação sempre tenha as informações mais recentes. Para implantar e agendar as funções, siga as instruções na seção de ajuda da aplicação após a implantação.
