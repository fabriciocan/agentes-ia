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
