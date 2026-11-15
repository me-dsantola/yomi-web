# YOMI — Portal Oficial & Companion Web

Portal Web Oficial e Companion do aplicativo **YOMI** (leitor minimalista de mangás, manhwas e webtoons para Android, pacote `com.kuroreader.kuro_reader`).

## Recursos Implementados

1. **Landing Page AMOLED Dark Glass (`/`)**:
   - Identidade visual AMOLED Pitch Black (`#070709`), logo vetorial oficial do YOMI (`/public/brand/`), e seletor de acento reativo (*Dynamic Accent Glow*).
   - **Smart Download Box**: Detecta automaticamente Android, Desktop ou iOS, recomenda a arquitetura `arm64-v8a`, gera QR Code instantâneo para download direto na câmera do celular e permite copiar o hash SHA-256.
   - **Mockup Interativo**: Alterna entre Destaques, Perfil/Blobatar e Leitor Webtoon com aura Ambilight reativa.
2. **Central de Download Inteligente (`/download`)**:
   - Integração server-side com `https://api.github.com/repos/me-dsantola/kuro-reader/releases/latest` (cache de 15 minutos) cruzada com `release.json` e `SHA256SUMS.txt`.
   - Exibe apenas as arquiteturas reais (`arm64-v8a`, `armeabi-v7a`, `x86_64`), changelog em Markdown sanitizado e histórico de versões anteriores.
3. **Guia Interativo de Instalação & FAQ (`/instalar`)**:
   - Passo a passo em 4 etapas para instalação e atualização sem perda de dados no Android + 7 perguntas frequentes.
4. **Companion Dashboard & Backups `.kuro` (`/conta` e `/conta/backup`)**:
   - Autenticação Google via Firebase Auth (`signInWithPopup` / `signInWithRedirect`) e leitura isolada por usuário do documento `users/{uid}` no Cloud Firestore.
   - Decodificador e validador completo do formato `.kuro` (Schema v4, JSON puro ou Base64 UTF-8), exibindo Favoritos, Continuar Lendo, Coleções Personalizadas e o mascote **Blobatar**.
   - Modo Demonstração Interativa para visitantes sem login e limpeza completa de cache no logout.
5. **Catálogo Web & Quick Reader (`/explorar`, `/obra/[id]`, `/ler/[chapterId]`)**:
   - Proxy server-side (`/api/md/[...path]`) para metadados da API pública do MangaDex; imagens carregadas diretamente da rede `MangaDex@Home`.
   - Leitor Web com modo **Webtoon Vertical Contínuo** (`gap-0`, zero frestas) e **Paginado (RTL/LTR)**, atalhos de teclado, pré-carregamento de 4 páginas, modo economia de dados e sincronização transacional de progresso no Firestore.

## Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente (opcional para conectar ao Firebase real)
cp .env.example .env.local

# 3. Rodar testes unitários (Vitest)
npm test

# 4. Iniciar servidor de desenvolvimento
npm run dev
```
