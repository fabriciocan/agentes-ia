# Agent Memory — nuxt-frontend-specialist

## Meta / WhatsApp Embedded Signup

- **OAuth manual popup** (not FB SDK): use `window.open(facebookOauthUrl, ..., 'width=700,height=700')` to avoid error 36008.
- `redirect_uri` MUST be `window.location.origin + '/admin/meta/callback'` — identical on client and server.
- Callback page at `app/pages/admin/meta/callback.vue` with `definePageMeta({ layout: false })`.
- Callback reads `code` from `useRoute().query`, posts to `/api/admin/meta/accounts` with `{ code, redirect_uri }`, then sends `postMessage` to opener and calls `window.close()`.
- Parent listens with `window.addEventListener('message', ...)` and filters by `event.origin === window.location.origin`.
- Server handler (`server/api/admin/meta/accounts/index.post.ts`) calls `exchangeCodeForToken(code, appId, appSecret, redirectUri)` — already implemented in `whatsapp-cloud.service.ts`.

## Project Conventions

- SSR globally disabled (`ssr: false`). All client-side logic goes in `onMounted`.
- Layouts: `admin` for /admin/*, `default` for public pages, `false` for standalone popup pages.
- Icons: `i-lucide-*` preferred; `i-heroicons-*` also available.
- Runtime config: `config.public.metaAppId`, `config.public.metaEmbeddedSignupConfigId`, `config.metaAppSecret` (private).
- Primary color: green.
- UModal uses `v-model:open` (not `v-model`). Slot names: `#body`, `#footer`.
- USelect options format: `{ label: string, value: string }`.
- CSS vars: `bg-(--ui-bg)`, `bg-(--ui-bg-elevated)`, `bg-(--ui-bg-accented)`, `text-(--ui-text-muted)`, `text-(--ui-text-dimmed)`, `text-(--ui-text-highlighted)`, `border-(--ui-border)`, `text-(--ui-primary)`.
- useFetch for initial page loads; $fetch for mutations (POST/PATCH/DELETE).
- Agents list: `GET /api/admin/agents` → `{ data: [{ id, name, company_id }] }`.

## Kanban Module

- Files at `app/components/kanban/` (KanbanCard, KanbanCardModal, KanbanColumn, KanbanCreateModal, KanbanFilters) and `app/pages/admin/kanban.vue`.
- Board API base: `/api/admin/agents/:agentId/kanban` (GET/POST/PATCH/DELETE).
- Columns API: `/api/admin/kanban/:boardId/columns` (POST) and `/:columnId` (PATCH/DELETE).
- Cards API: `/api/admin/kanban/:boardId/cards` (POST) and `/:cardId` (PATCH/DELETE) and `/:cardId/move` (PATCH `{ column_id }`).
- HTML5 drag-and-drop: dragstart sets `dataTransfer.setData('text/plain', cardId)`; drop reads it back. Use optimistic update then revert on error.
- Column color stored as hex string; render via `:style="{ borderLeftColor: column.color }"`.
- Entry column tracked by `board.entry_column_id`; shown as green "Entrada" badge.
