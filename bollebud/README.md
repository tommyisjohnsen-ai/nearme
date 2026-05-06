# Bollebud 🥐

Mobile bolleselgere møter sultne kunder i sanntid. Mobil-først PWA — ingen app store, fungerer i nettleseren.

## Hva det er

- **Kunder** ser et live-kart med bolleselgere innen 3 km, sender en bestilling og chatter direkte med selgeren til boller er i hånda.
- **Utsalg** (mobil bod, sykkel, bil) slår seg "online", deler posisjon hvert ~15. sekund, mottar bestillinger med Web Push og styrer status fra bestilling til levering.
- **Admin** ser KPI-er, kan suspendere utsalg, og ser alle bestillinger.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind + egne shadcn-stilte primitives
- **Supabase** — Postgres + PostGIS + Auth (magic link) + Realtime + Storage
- **react-leaflet** + OpenStreetMap-tiles (gratis for MVP)
- **Web Push** + service worker (`web-push` lib, VAPID-nøkler)
- **next-pwa** — installerbar på mobil, offline fallback for cachebare ruter
- **Vitest** + **Playwright** for tester

## Lokal utvikling — første gang

Forutsetninger: Node 20+, pnpm, Docker (for Supabase), Supabase CLI (`brew install supabase/tap/supabase`).

```bash
# 1. Avhengigheter
pnpm install

# 2. Generer VAPID-nøkler (Web Push)
pnpm vapid:generate
# → kopier output til .env.local

# 3. Kopier env-mal og fyll inn
cp .env.example .env.local

# 4. Start lokal Supabase (Postgres + Auth + Realtime + Studio)
supabase start
# → kopier API URL + anon key + service role key til .env.local

# 5. Kjør migrasjonene + seed data (1 admin, 2 utsalg, 3 kunder)
supabase db reset

# 6. Generer typer fra det aktuelle skjemaet
pnpm supabase:types

# 7. Start utviklingsserveren
pnpm dev
```

Åpne http://localhost:3000.

### Logge inn lokalt

Magic-link e-post i lokal Supabase går til Inbucket på http://localhost:54324. Skriv inn en av seed-e-postene (admin@bollebud.local, sara@bollebud.local, …), åpne Inbucket og klikk lenken.

## Miljøvariabler

| Variabel | Hva | Hvor den kommer fra |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-URL | `supabase status` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klient-side anon-nøkkel | `supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin-nøkkel | `supabase status` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push (klient) | `pnpm vapid:generate` |
| `VAPID_PRIVATE_KEY` | Web Push (server) | `pnpm vapid:generate` |
| `VAPID_CONTACT_EMAIL` | mailto: for VAPID-spec | velg en e-post |
| `NEXT_PUBLIC_APP_URL` | Fullt URL til appen | f.eks. http://localhost:3000 |
| `NEXT_PUBLIC_DEFAULT_LAT/LNG/RADIUS_M` | Geo-defaults når lokasjon mangler | Oslo sentrum, 3 km |

Fullt eksempel ligger i [.env.example](./.env.example).

## Mappestruktur

```
app/                   # Next.js App Router-ruter
  (auth)/login         # Magic-link skjema
  (auth)/onboarding    # Rollevalg ved første pålogging
  (customer)           # Kart + bestillingsflyt + chat
  (vendor)             # Dashboard + go online + ordrebehandling
  (admin)              # KPI-er + tabeller
  api/push/...         # Subscribe + send Web Push
  auth/callback        # Tar imot magic-link redirect
components/            # UI-komponenter (Map, ChatThread, dialoger, …)
hooks/                 # useGeolocation, useNearbyVendors, useOrderChat, …
lib/                   # Supabase-klienter, geo, push, realtime, env
types/                 # Database-typer (regenerert) + domene-view-models
supabase/migrations/   # 0001 init, 0002 RLS, 0003 RPC, 0004 realtime
supabase/seed.sql      # Lokale fixtures
tests/unit/            # Vitest
tests/e2e/             # Playwright
```

## Deploy

### Frontend → Vercel

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add VAPID_CONTACT_EMAIL
vercel env add NEXT_PUBLIC_APP_URL
vercel deploy --prod
```

### Backend → Supabase Cloud

1. Lag prosjekt på supabase.com.
2. Kjør migrasjonene: `supabase db push`.
3. Kopier API URL + nøkler til Vercel env.
4. Site URL i Auth-settings: din produksjons-URL. Legg til `https://din-app.vercel.app/**` i additional redirect URLs.

## Vanlige problemer

**"Magic link works lokalt men ikke i prod"** — Site URL og redirect URLs i Supabase Auth må peke på prod-URL.

**"Push fungerer ikke på iOS"** — Web Push på iOS krever at brukeren har lagt til appen på hjemskjermen først (PWA installert) og iOS 16.4+. Bruk Safari, ikke Chrome.

**"Vendors vises ikke på kartet"** — Sjekk at:
1. Vendor er `is_active = true`
2. Det finnes en åpen `vendor_sessions`-rad (`ended_at is null`)
3. `last_seen_at` er nyere enn 60 sekunder
4. Avstand er innen `radius_m`

**"Realtime channels gir ingen events"** — Tabeller må være lagt til i `supabase_realtime`-publikasjonen. Migrasjon 0004 gjør det automatisk.

## Tester

```bash
pnpm test         # Vitest unit
pnpm test:e2e     # Playwright (krever lokal server kjørende eller PLAYWRIGHT_BASE_URL)
```

## Sjekkliste — MVP

| Status | Funksjon |
|---|---|
| ✅ | Auth via magic link |
| ✅ | Rollevalg (kunde / utsalg) ved onboarding |
| ✅ | Vendor "Gå online" — åpner session, sender posisjon hvert 15. sek |
| ✅ | Kundekart med online utsalg, avstand, gangtid |
| ✅ | Bestillingsmodal (antall, hent/lever, fritekst) |
| ✅ | Sanntid chat per bestilling (Supabase Realtime) |
| ✅ | Statusflyt requested → accepted → en_route → delivered |
| ✅ | Web Push abonnement + service worker |
| ✅ | Push fyrer av når status endres / chat-melding lander |
| ✅ | Admin: utsalgstabell, ordretabell, KPI-kort |
| ✅ | RLS-policies — eksplisitte tester med to brukere mangler |
| ✅ | PWA-manifest + ikoner + offline shell via next-pwa |
| ✅ | Vitest unit-tester (geo, transitions) |
| ⚠️ | Playwright order-flow er skissert men trenger Supabase-session-injection i CI |
| ⚠️ | Lighthouse > 90 — ikke kjørt automatisk; verifiser etter første deploy |

## V2 — neste

Sett opp som issues:

1. Stripe Checkout integrasjon (orders får `pending_payment`-status før `requested`).
2. WebRTC-videochat via Daily.co for utsalg som vil vise frem boller live.
3. 1–5 stjerner rating på `delivered`-event.
4. Heatmap for utsalg — hvor er det forespørsler akkurat nå.
5. Planlagte bestillinger ("kom forbi kl 02:30").
6. Replace klient-utløst push med Postgres-trigger → Supabase Edge Function.
