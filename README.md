# Yomi Web

Site e leitor web do Yomi, com catálogo MangaDex, biblioteca sincronizada, comentários e avaliações da comunidade.

## Desenvolvimento

Node.js 22 e npm.

```bash
npm ci
npm run dev
```

A configuração Firebase pode ser informada pelas variáveis de `.env.example`. A leitura do catálogo é pública; avaliações, comentários e sincronização exigem uma conta.

## Validação

```bash
npm test
npm run typecheck
npm run build
npm --prefix tests/firestore ci
npm run test:rules
```

O emulador exige Java 21 e Firebase CLI. A CI também verifica o site em Chromium e WebKit, com larguras de 320, 390, 844 e 1280 pixels, usando contas e dados sintéticos em um projeto demo.

## Organização

- `src/app`: páginas e rotas HTTP.
- `src/components`: interface, leitor, mascote, comentários e avaliações.
- `src/lib`: catálogo, Firebase, rankings, sincronização e regras de domínio.
- `src/__tests__`: testes unitários.
- `tests/firestore`: regras de acesso e integridade no emulador.
- `tests/mobile`: verificações de navegador e responsividade.
- `docs`: integração, mascote e notas de versão.

## Avaliações e Em alta

Cada conta pode atribuir uma nota inteira de 1 a 5 e alterá-la. A nota média e a quantidade de votos aparecem na obra. As alterações do voto e do total são transacionais e validadas pelas regras Firestore.

O ranking usa `(soma das notas + 3,5 × 5) / (quantidade de votos + 5)`. Isso equilibra notas e volume de avaliações. O desempate considera a quantidade de votos e o ID da obra. A vitrine pública usa obras classificadas como safe ou suggestive. Sem avaliações disponíveis, mostra destaques editoriais com identificação própria.

Os votos individuais só podem ser lidos pela própria conta; os totais são públicos.

## Publicação

A release web é criada após testes, build, regras Firestore e verificações de navegador aprovarem o commit da `main`. A release não gera APK; o aplicativo Android tem seu próprio repositório.

**As regras Firestore precisam ser publicadas no projeto Firebase usado pelo site antes de habilitar as avaliações em produção:**

```bash
firebase deploy --only firestore:rules --project kuro-reader
```

Esse comando exige acesso autorizado ao projeto. A CI usa exclusivamente `demo-yomi-kuro` e não publica regras no ambiente real.

`NEXT_PUBLIC_YOMI_EMULATORS=1` conecta os testes aos emuladores somente em localhost/127.0.0.1. Essa variável não deve ser configurada no deploy público.
