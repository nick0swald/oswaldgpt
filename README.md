# OswaldGPT

Hulp bij NaSk-vragen voor VMBO-leerlingen (Aeres, klas van Nick Oswald).

Leerlingen plakken of snappen een vraag. Oswald geeft eerst hints — het antwoord komt pas als ze erom vragen.

## Starten

```bash
npm install
cp .env.example .env
npm run dev
```

Zet in `.env`:

- `XAI_API_KEY` — xAI-sleutel voor Grok
- `DOCENT_PIN` — wachtwoord voor het docent-overzicht (5× tikken op OswaldGPT)
- `DATABASE_URL` — Postgres in productie (lokaal valt hij terug op PGLite)

## Docent

Vijf keer op **OswaldGPT** tikken, daarna het wachtwoord. Je ziet gebruik per dag: vragen, antwoorden, gemiddelde tijd tot antwoord.

## Deploy

Koppel deze repo aan [Vercel](https://vercel.com) en zet dezelfde env-variabelen daar.
