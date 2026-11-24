# Integração YOMI App (Flutter) + YOMI Web (Next.js)

Este documento descreve os contratos de dados, regras de sincronização, canonização de identificadores e garantias de compatibilidade entre o portal web (`yomi-web`) e o aplicativo Android (`kuro-reader`).

---

## 1. Visão Geral da Arquitetura no Firebase

Ambas as plataformas compartilham o mesmo projeto Firebase Auth + Cloud Firestore:

- **Coleção `users/{uid}`**: Armazena o estado completo do usuário encapsulado no formato `.kuro` (`payload`) acompanhado de metadados de leitura rápida (`userEmail`, `userDisplayName`, `profile`, `avatarBase64`, `bannerBase64`, `favoritesCount`, `historyCount`, `readingListsCount`, `mascotName`, `updatedAt`, `updatedAtLocal`).
- **Coleção `comments/{commentId}`**: Armazena comentários públicos de obras (`targetType: 'manga'`) e capítulos (`targetType: 'chapter'`).
- **Regras de Segurança**: Definidas em [`firestore.rules`](../firestore.rules).

---

## 2. Esquema do Backup `.kuro` (Versão 4) e `users/{uid}`

Implementado em espelho entre [`backup_codec.dart`](../../kuro-reader/lib/services/backup_codec.dart) (Flutter) e [`kuroCodec.ts`](../src/lib/backup/kuroCodec.ts) (Web):

- **Codificação**: Objeto JSON UTF-8, serializado diretamente (começando com `{`) ou codificado em Base64 UTF-8 (padrão compacto em `payload`), com limite máximo de entrada de 24 MB (`MAX_BACKUP_INPUT_LENGTH`). **Importante:** Base64 é codificação de transporte, não criptografia.
- **Campos principais do objeto `.kuro` v4**:
  - `version`: inteiro entre `1` e `4` (`CURRENT_BACKUP_VERSION = 4`).
  - `favorites`: mapa `Record<mangaId, YomiMangaEntry>`.
  - `history`: mapa heterogêneo contendo:
    - `read_<chapterId>`: `boolean` — capítulo marcado como lido.
    - `page_<chapterId>`: `number` — última página lida (`>= 0`).
    - `last_<mangaId>`: `YomiChapterEntry` — último capítulo aberto na obra.
    - `manga_meta_<mangaId>`: `YomiMangaEntry` — snapshot de metadados da obra.
    - `chapters_count_<mangaId>`: `number` — contagem confirmada de capítulos conhecida para a obra (preservada na nuvem).
    - `recent_reading_list`: `YomiRecentReadingItem[]` — histórico ordenado dos últimos mangás lidos.
    - `reading_events_log`: histórico de eventos de leitura.
  - `settings`: preferências de leitura e listas personalizadas em `settings.user_reading_lists` (`YomiReadingList[]`).
  - `profile`: identidade do usuário e personalização do mascote Blobatar (`name`, `bio`, `favoriteGenre`, `blobatarName`, `blobatarSeed`, `blobatarShape`, `blobatarExpression`, `blobatarHue`, `customAccentColor`, etc.).
- **Preservação de chaves desconhecidas**: O codec Web preserva integralmente campos extras gravados por versões mais novas do app Flutter (spread `...decoded`) para impedir perda de dados em edições cruzadas.

### 2.1 Proteção contra o Limite de 1 MB do Firestore (`stripEphemeralCacheForCloud`)

Tanto `BackupCodec.stripEphemeralCacheForCloud` (Flutter) quanto `stripEphemeralCacheForCloud` (`kuroCodec.ts` / `cloudSync.ts` na Web) aplicam a mesma limpeza antes de gravar no Firestore:

1. Removem caches efêmeros de capítulos (`history['chapters_*']`), **preservando sempre `chapters_count_*`**.
2. Limitam `history['recent_reading_list']` aos **30** itens mais recentes.
3. Limitam `history['reading_events_log']` aos **150** eventos mais recentes.

### 2.2 Prevenção de Conflitos e Mesclagem Segura

- Toda mutação escrita pela Web (`saveWebReaderProgressToCloud`, `toggleCloudFavorite`, `saveCloudReadingLists`, `updateCloudUserProfile`, `toggleChapterReadInCloud`, `importKuroBackupToCloud`) executa dentro de `runTransaction` no Firestore.
- Antes de gravar, valida se `existingData.userEmail` coincide com o e-mail da conta autenticada; em caso de divergência, aborta a leitura/escrita.
- Chaves em `history` são mescladas de forma não destrutiva e `recent_reading_list` deduplica entradas equivalentes por `mangaId`.

---

## 3. Canonização de Identificadores (`cleanMangaDexId`)

Para evitar fragmentação entre fontes ou IDs legados do app mobile, prefixos antigos são removidos com a expressão:

```regex
/^(cmk_mdx_|hq_mdx_|ani_mdx_|mal_mdx_|cmk_title_)+/i
```

- **Favoritos, Histórico e Rotas (`/obra/[id]`)**: Comparações entre entradas locais, biblioteca da nuvem e MangaDex usam `cleanMangaDexId(id)` para que `cmk_mdx_<uuid>` e `<uuid>` sejam tratados como a mesma obra.
- **Comentários (`normalizeCommentTargetId`)**:
  - Quando `targetType === 'manga'`, `targetId` é sempre canonizado com `cleanMangaDexId(targetId)`.
  - Quando `targetType === 'chapter'`, prefixos legados (`cmk_mdx_`, `hq_mdx_`, `ani_mdx_`, `mal_mdx_`) também são removidos antes da consulta ou gravação.

---

## 4. Contrato Compartilhado da Coleção `comments/{commentId}`

Web e app Flutter compartilham a coleção raiz `comments` no Cloud Firestore com os seguintes campos:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | `string` | Auto (doc ID) | Identificador do documento no Firestore |
| `targetId` | `string` | Sim | ID canônico da obra ou capítulo (sem prefixo legado) |
| `targetType` | `'manga' \| 'chapter'` | Sim | Escopo do comentário |
| `userId` | `string` | Sim | UID do Firebase Auth (`request.auth.uid`) |
| `userName` | `string` | Sim | Nome de exibição do leitor (`1..100` chars) |
| `userPhotoUrl` | `string \| null` | Não | URL de foto de perfil (opcional) |
| `mascotColorId` | `string` | Não | Cor hexadecimal de acento do mascote (ex.: `#FF2A55`) |
| `mascotExpressionId` | `string` | Não | Expressão do Blobatar (ex.: `happy`, `thinking`) |
| `mascotShapeId` | `string` | Não | Formato geométrico do Blobatar (ex.: `auto`, `squircle`) |
| `text` | `string` | Sim | Conteúdo do comentário (`1..800` chars após `.trim()`) |
| `isSpoiler` | `boolean` | Sim | Marca o conteúdo para ocultação inicial na UI |
| `likes` | `number` | Sim | Contagem sincronizada com `likedBy.length` (`>= 0`) |
| `likedBy` | `string[]` | Sim | Lista deduplicada de UIDs que curtiram |
| `createdAt` | `number \| Timestamp \| string` | Sim | Armazenado pela Web como epoch ms; leitura suporta `number`, Firestore `Timestamp` e ISO-8601 |

### Garantias de Segurança e Confiabilidade

1. **Zero falsos comentários públicos**: `postComment` nunca mascara uma falha de rede ou permissão criando comentário `local_...` como se fosse publicado globalmente. Em caso de erro, a UI preserva o texto no compositor e exibe erro com retentativa ou salvamento explícito como rascunho local.
2. **Rascunhos locais preservados**: Entradas pré-existentes ou salvas em `localStorage` (`yomi-comments-v1:<targetId>`) são carregadas exclusivamente com `isLocalDraft: true` em uma seção separada e identificável, permitindo ao usuário publicá-las no Firestore ou descartá-las sem apagamento silencioso.
3. **Curtidas transacionais**: `toggleLikeComment` usa `runTransaction` para atualizar `likedBy` e `likes = nextLikedBy.length` atomicamente, evitando dessincronia em cliques concorrentes.
4. **Exclusão autorizada**: `deleteComment` verifica `data.userId === currentUserId` (ou `isModerator`) e propaga falhas do Firestore; as regras em `firestore.rules` reforçam a restrição no servidor.
