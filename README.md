# arbeidsplassen-tests

Arbeidsplassen tests

## Install

`npm install`

## Om testene

For å få tilgang til \* .intern.dev.nav.no er testene som er avhengig av en innlogget bruker satt opp til å kjøre som en Nais-jobb.<br>

Testene som ikke er avhengig av en innlogget bruker kjører mot produksjon.

### Første gang

Installer avhengigheter og Playwright-browsere:
```bash
npm ci
npx playwright install --with-deps
```
### Start Playwright GUI lokalt

Følgende kommando start Playwright i UI mode, med mulighet for å kjøre en eller flere tester visuelt.

```bash
export HTML_VALIDATOR_URL="http://localhost:8888/?out=json"
npx playwright test --ui
```

### DEV- og tilgjengelighetstester
Kjør alle dev-/UU-tester:
```bash
npx playwright test dev-e2e
```

Kjør en enkelt fil:
```bash
npx playwright test tests/dev-e2e.spec.js
```

Slack-varsling er som standard skrudd av lokalt.
For å teste Slack-varsler kan du sette:

```bash
export SLACK_ALERTS_ENABLED=true
export SLACK_BOT_TOKEN=<token>
npx playwright test dev-e2e
```

### Prod: lenker og HTML-validering (prod-checklinks)
Testen prod-checklinks crawler utvalgte sider i prod, sjekker interne/eksterne lenker og validerer HTML.

>NB: Denne testen kan ta flere minutter. Den er ment å kjøre nattlig i CI, men kan også kjøres manuelt ved behov.

### lokal Nu HTML Checker
For å få samme oppsett som i CI, kan du kjøre Nu HTML Checker lokalt via Docker:

1. Start validatoren:
```bash 
docker run --rm -p 8888:8888 ghcr.io/validator/validator:latest
```
2. Kjør testen med lokal validator:

```bash
export HTML_VALIDATOR_URL="http://localhost:8888/?out=json"
npx playwright test tests/prod-checklinks.spec.js
```
### Playwright-rapport
```bash
npx playwright show-report
```
### Mer informasjon om tester som feiler.

Logger med mer informasjon om testene som feiler kan finnes i:<br>
Nais:
[https://console.nav.cloud.nais.io/team/arbeidsplassen/jobs](https://console.nav.cloud.nais.io/team/arbeidsplassen/jobs)<br>
GitHub: [https://github.com/navikt/arbeidsplassen-e2e-tests/actions](https://github.com/navikt/arbeidsplassen-e2e-tests/actions)

### Beskrivelse av testfilene

#### dev-e2e (dev-miljø, logger finnes i Nais)

Kjøes ved merge til master i `pam-stillingsok`. Kjører sjekk av universell utforming med: [https://www.npmjs.com/package/@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)<br>
Kjører sjekk av favoritter, ved å logge inn, lagre en favoritt, så sjekke at denne finnes på siden for favoritter.

#### prod-uptest (prod-miljø, logger finnes i GitHub)

Sjekker at forsiden laster inn i prod.<br>
Sjekker at arbeidsplassen.nav.no/stillinger laster, og gir fler enn 0 treff.

#### prod-checklinks (prod-miljø, logger finnes i GitHub)

Sjekker at alle linker er gyldige, men sjekker ikke lenker i stillingsannonser. Dette er en test man potensielt kan droppe, da denne dataen finnes i SiteImprove.<br>
Validerer HTML mot W3C.

## Universell utforming (automatisk vs. manuell test)

Vi kjører ende-til-ende-tester med Playwright, og bruker i tillegg axe-core for å fange tekniske WCAG-brudd.  
Målet er at mest mulig av de “tekniske” kravene fanges automatisk, slik at man i tilgjengelighetserklæringen kan fokusere på innhold, forståelighet og designvalg.

Feil i E2E-/axe-testene varsles automatisk til Slack-kanal for testvarsler.

### Oversikt over WCAG-krav og hvordan de testes

| WCAG-punkt                                                             | Hva sjekkes                                                                                                                                    | Hvordan testes                                                      | Hvor ofte                                                      |
|------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|----------------------------------------------------------------|
| 1.1.1 Ikke-tekstlig innhold                                            | At bilder/ikoner har `alt` eller annen tekstlig erstatning. Kvaliteten på teksten vurderes manuelt.                                            | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene (CI på PR + produksjonsdeploy) |
| 1.3.1 Info og relasjoner                                               | Semantikk for overskrifter, lister, landemerker og kobling mellom `label` og `input`.                                                          | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 1.4.3 Kontrast (minimum)                                               | Grunnleggende fargekontrast mellom tekst og bakgrunn.                                                                                          | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 1.4.4 Endring av tekststørrelse                                        | At vi ikke blokkerer zoom (korrekt `meta viewport`, ingen `user-scalable=no`).                                                                 | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 1.4.10 Reflow                                                          | At viktige sider fungerer på 320 px bredde uten horisontal scroll.                                                                             | Automatisk (egen Playwright-test med smal viewport)                 | Ved hver kjøring av E2E-testene                                |
| 1.4.12 Tekstavstand                                                    | At sentralt innhold ikke kollapser/klippes når linjeavstand og bokstavavstand økes.                                                            | Automatisk (egen Playwright-test som injiserer tekst-spacing-CSS)   | Ved hver kjøring av E2E-testene                                |
| 2.1.1 Tastaturtilgjengelighet *                                        | At hovedflyter (søke, filtrere, åpne stilling, sende skjema) kan brukes med tastatur.                                                          | Automatisk (Playwright-scenarier som kun bruker tastatur)           | Ved hver kjøring av E2E-testene                                |
| 2.4.1 Hoppe over blokker                                               | At “Hopp til hovedinnhold”-lenke finnes, får fokus først og flytter fokus til `main`.                                                          | Automatisk (Playwright-scenarie: `Tab` + `Enter`)                   | Ved hver kjøring av E2E-testene                                |
| 2.4.2 Sidetittel                                                       | At sider har `<title>` og at den ikke er tom. manuelt sjekk at den er god og beskrivende for bruker.                                           | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 2.4.3 Fokusrekkefølge & 2.4.7 Fokus synlig *                           | At fokus beveger seg i logisk rekkefølge og at fokusmarkering er synlig.                                                                       | Automatisk (Playwright-scenarier som tabber gjennom viktige flyter) | Ved hver kjøring av E2E-testene                                |
| 2.4.6 Overskriftnivå                                                   | Overskkriftnivåer sjekkes automatisk                                                                                                           | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 3.1.1 Språk på siden                                                   | At `lang` på `<html>` er satt. Riktig språkvalg vurderes manuelt.                                                                              | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 3.1.2 Språk på deler                                                   | At elementer med `lang` bruker gyldige språkkoder.                                                                                             | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 🛑 3.3.1 Feilidentifikasjon, 3.3.2 Ledetekster, 3.3.3 Forslag ved feil | At skjemafelter har labels, at feil markeres med `aria-invalid`/feiltekst og at feiloppsummering vises. Selve tekstinnholdet vurderes manuelt. | Automatisk (Playwright-scenarier som sender inn ugyldige skjemaer)  | Ved hver kjøring av E2E-testene                                |
| 4.1.1 Parsing                                                          | At HTML er teknisk gyldig på åpne sider. Innloggede sider trenger en liten sjekk.                                                              | Automatisk (axe-core + HTML-validering i E2E for åpne sider)        | Ved hver kjøring av E2E-testene                                |
| 4.1.2 Navn, rolle, verdi                                               | At ARIA-roller og `aria-*` brukes gyldig, og at interaktive komponenter har tilgjengelig navn.                                                 | Automatisk (axe-core via Playwright)                                | Ved hver kjøring av E2E-testene                                |
| 🛑 4.1.3 Statusmeldinger                                               | At viktige status-/feilmeldinger (lagret, sendt, feil) annonseres med `role="status"` / `role="alert"` eller `aria-live`.                      | Automatisk (Playwright-scenarier som triggere statusmeldinger)      | Ved hver kjøring av E2E-testene                                |
🛑 = Skjema relaterte krav som vi ikke har tester på i dag
## Krav som er delvis automatisert / begrenset dekning
- 2.1.1 Tastaturtilgjengelighet (A)
  - Ny favoritt-test dokumenterer at én viktig funksjon (lagre stilling) kan brukes med tastatur.
  - Men kravet gjelder all funksjonalitet, så det er fortsatt behov for manuell (eller flere automatiske) sjekker andre steder.

- 2.4.3 Focus order (A) & 2.4.7 Focus visible (AA)
  - Har nå:
    - skip-link-test → sjekker at du kan komme til skip-link tidlig og at neste Tab havner i main.
    - keyboard-favoritt-test → viser at favoritt-knapp er tastaturnavigerbar og kan aktiveres med Space.

  - Har ingen eksplisitt automatisk sjekk som:
    - går gjennom en hel side og verifiserer “logisk rekkefølge”, eller
    - sjekker at fokusmarkeringen visuelt oppfyller designkravet. → Så: delvis dekket (på viktige punkter), men ikke “100 % automatisk”.

TODO: Legge til tester som dekker de som ikke allerede er på plass
### Manuelle kontroller

Følgende kontroller gjøres i hovedsak manuelt når tilgjengelighetserklæringen oppdateres:

- Kvalitet på alt-tekster, overskrifter, lenketekster og hjelpetekster.
- Om sidetitler, overskrifter og feilmeldinger er forståelige og beskrivende.
- Kompleks interaksjon (for eksempel dynamiske filtre, modaler, stegvis navigasjon) vurderes med skjermleser og zoom.
- Brukeropplevelse på mobil, nettbrett og desktop ved 200–400 % zoom.

Disse manuelle kontrollene suppleres av de automatiske testene over, slik at vi får både teknisk og innholdsmessig kvalitet.