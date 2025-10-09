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

Kjører sjekk av universell utforming med: [https://www.npmjs.com/package/@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)<br>
Kjører sjekk av favoritter, ved å logge inn, lagre en favoritt, så sjekke at denne finnes på siden for favoritter.

#### prod-uptest (prod-miljø, logger finnes i GitHub)

Sjekker at forsiden laster inn i prod.<br>
Sjekker at arbeidsplassen.nav.no/stillinger laster, og gir fler enn 0 treff.

#### prod-checklinks (prod-miljø, logger finnes i GitHub)

Sjekker at alle linker er gyldige, men sjekker ikke lenker i stillingsannonser. Dette er en test man potensielt kan droppe, da denne dataen finnes i SiteImprove.<br>
Validerer HTML mot W3C.

#### TODO:

Akkurat nå kjøres dev-e2e testene en gang ved midnatt. Denne bør hektes på GitHub workflow så den kjører ved merge til master i pam-stillingsok.
