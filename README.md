# arbeidsplassen-tests

Arbeidsplassen tests

## Install

`npm install`

## Om testene

For å få tilgang til \* .intern.dev.nav.no er testene som er avhengig av en innlogget bruker satt opp til å kjøre som en Nais-jobb.<br>

Testene som ikke er avhengig av en innlogget bruker kjører mot produksjon.

### Start Playwright GUI lokalt

Følgende kommando start Playwright i UI mode, med mulighet for å kjøre en eller flere tester visuelt.

`npx playwright test --ui`

### Kjør en enkelt test

```
npx playwright test "navnet på testen"
Eksempel
npx playwright test prod-checklinks
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

### Universell utforming

Følgende krav blir testet automatisk, og trengs i hovedsak ikke testes når tilgjengelighetsrapporten skrives.

- 1.1.1 alt-tagger på bilder sjekkes.
- 2.4.2 Sjekker at den finnes, men ikke om den er god og beskrivende for bruker.
- 2.4.6 Overskriftnivåer sjekkes automatisk.
- 3.1.1 Språk på siden. Sjekker at det finnes, dog ikke om den har riktig kode. `lang="no"` osv.
- 3.3.2 Ledetekster til skjemaelementer sjekkes automatisk.
- 4.1.1 Parsing. HTMLen blir validert automatisk på åpne sider, så innloggede sider trenger en liten sjekk.
