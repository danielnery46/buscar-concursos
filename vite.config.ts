import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin customizado para remover scripts de desenvolvimento do index.html no build
    {
      name: 'html-transform',
      apply: 'build', // Aplica este plugin apenas para builds de produção
      transformIndexHtml(html) {
        // Remove o script da CDN do Tailwind
        const withoutTailwind = html.replace(
          /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/,
          ''
        );
        // Remove o script do importmap
        const withoutImportmap = withoutTailwind.replace(
          /<script type="importmap">[\s\S]*?<\/script>\s*/,
          ''
        );
        return withoutImportmap;
      },
    },
  ],
  preview: {
    host: true, 
    port: 4173,
  }
})
