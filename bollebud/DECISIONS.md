# Bollebud — Beslutningslogg

Dette er der jeg dokumenterer valgene jeg tok der promptet ga rom for tolkning. Endre fritt.

## Antakelser jeg gjorde fra starten

- **Språk:** Norsk i UI, engelsk i koden. Domeneord (`bolle`, `utsalg`) på norsk når de allerede er norske; tekniske ord (`createOrder`, `useGeolocation`) på engelsk. Database-kolonner er engelske for kompatibilitet med standard verktøy.
- **Standard geo-senter:** Oslo sentrum (`59.9139, 10.7522`) når lokasjon mangler. Konfigurerbar i env.
- **Standard radius:** 3 km. Konfigurerbar i env.
- **Posisjonsoppdatering:** 15 sekunder ELLER 10 m bevegelse, det som inntreffer først, men aldri sjeldnere enn hver 60. sekund. Balanse mellom batteri og friskhet.
- **"Friskhet"-grense for online-status:** 60 sekunder uten oppdatering → utsalget blir filtrert bort fra kundekartet. Forhindrer at vendors som lukker tab-en uten å gå offline blir "spøkelser".
- **Ingen betaling:** MVP har ingen Stripe — pengene ordnes mellom kunde og utsalg (Vipps utenfor app, kontant). Stripe i v2.
- **iOS-push:** Krever PWA installert + iOS 16.4+ + Safari. Vi viser en nudge, men funksjonaliteten kan ikke garanteres på alle enheter.

## Tekniske valg

- **PWA-pakke:** `next-pwa` framfor å skrive service worker selv. Tradeoff: vi taper litt kontroll, men sparer å reimplementere caching-logikken. Custom push-håndteringen kjøres som `importScripts` i tillegg.
- **Kart:** OpenStreetMap-tiles, ikke Mapbox. Gratis, fungerer med en gang, ingen API-key. Bytt om trafikk vokser.
- **Push fra klient, ikke DB-trigger:** I MVP fyrer vi push fra `/api/push/send` rett etter `transition_order_status` / message insert. Det er enklere enn Postgres trigger → Edge Function, men har en svakhet: hvis klient-tab-en dør mellom DB-write og fetch, går push tapt. Dokumentert som v2-arbeid.
- **Radius-querie:** PostGIS `ST_DWithin` — den standarde måten i Postgres. Bruker GIST-indeks på `last_location`.
- **Ingen Mapbox-direction service:** Vi viser en luftavstand-basert estimert gangtid (1.4 m/s ≈ 5 km/h). Mer enn nok for "skal jeg gå nå?" men lite nøyaktig i bygater. Bytt med en routing service hvis nødvendig.
- **Realtime via `postgres_changes`:** Hver `order:${id}`-kanal abonnerer på INSERTs på `order_messages` og UPDATEs på `orders`. Nearby vendors *polles* hvert 10. sekund i stedet for å abonnere — strømming av all `vendor_sessions`-trafikk per kunde er for støyete.
- **Singleton supabase-browser-klient:** Per tab. Auth-cookies håndteres av `@supabase/ssr` automatisk.
- **RLS-strategi:** Alt er deny-by-default. `is_admin()` er en `SECURITY DEFINER`-funksjon for å unngå rekursjon i policies. Hver tabell har eksplisitt en SELECT/INSERT/UPDATE-policy per rolle.
- **Status-overganger valideres i database:** RPC `transition_order_status` er kanonisk. Klient-koden duplikatkontroll i `allowedTransitions`-tabell — må holdes synkron, dokumentert med kommentar.
- **Vendor-eier får et utsalg per profil:** I onboarding-flyten lager vi én vendor. Multi-vendor-eier er v2 (legger en `vendors`-listevisning til vendor-dashboard).
- **Bun-count-grense:** 1–20 i en `CHECK`-constraint. Om noen virkelig vil bestille 50, kan de chatte.

## Sikkerhet

- **Service role-nøkkel kun server-side:** Aldri eksponert til browser. Brukes bare i `getSupabaseAdminClient()` for push-fanout der vi må krysse RLS for å finne mottakerens user_id.
- **Magic-link redirect:** `/auth/callback` whitelistes i Supabase Auth Settings. Vi sender `next`-param i state for å bevare hvor brukeren skulle.
- **Push-payload:** Inneholder ikke noe sensitivt. Kun "ny status" / "ny melding fra X" + en URL. Browseren viser uansett dette på låseskjermen, så vi behandler det som offentlig.

## Hva jeg skar bevisst i scope

- Multi-vendor per eier (én eier ↔ ett utsalg i MVP).
- Vendor-godkjenning av nye registreringer (alle utsalg er aktive til admin slår av).
- Avansert ratings/reviews-system.
- Schedulerte bestillinger.
- WebRTC video.
- Sanntids-koordinatstrømming på kunde-siden (kunden ser ikke vendors bevege seg live; oppdaterer seg hvert 10. sekund i stedet — billig nok, friskt nok).
- Email-templating for magic-links — vi bruker Supabase default.

## Åpne spørsmål

- **Domain & mailfra:** Sett opp custom SMTP i Supabase Auth-settings før prod-launch. Default-utgangsadressen er rate-limited.
- **GDPR:** Vi lagrer geo-spor per session. Per nå sletter vi ikke gamle sessions; legg til en cron-job som sletter sessions eldre enn 30 dager.
- **Drift av OpenStreetMap-tiles:** OpenStreetMap har en bruksvilkår-grense på "ikke for kommersielle apper med høy trafikk." Hvis Bollebud får mer enn 1000 daglige aktive brukere, bytt til Mapbox / Maptiler / selvhostet.
