# OswaldGPT

Hulp bij NaSk-vragen voor VMBO-leerlingen (Aeres, klas van Nick Oswald).

Leerlingen plakken of snappen een vraag, of kiezen hoofdstuk / paragraaf / vraagnummer. Oswald geeft eerst hints — het antwoord komt pas als ze erom vragen.

Live: [oswaldgpt.vercel.app](https://oswaldgpt.vercel.app)

## Starten

```bash
npm install
cp .env.example .env
npm run dev
```

Zet in `.env`:

- `XAI_API_KEY` — xAI-sleutel voor Grok (verplicht voor hints)
- `DOCENT_PIN` — wachtwoord voor het docent-overzicht (5× tikken op OswaldGPT)
- `DATABASE_URL` — Postgres in productie (lokaal valt hij terug op PGLite)

## Docent

Vijf keer op **OswaldGPT** tikken, daarna het wachtwoord. Je ziet gebruik per dag: vragen, antwoorden, gemiddelde tijd tot antwoord.

## Deploy (Vercel)

Koppel deze repo aan [Vercel](https://vercel.com). **Zonder `XAI_API_KEY` laadt de site wel, maar Hulp geeft: “Hulp is nu even niet beschikbaar.”**

In Vercel → Project → Settings → Environment Variables:

| Naam | Waarde |
| --- | --- |
| `XAI_API_KEY` | sleutel van [console.x.ai](https://console.x.ai) |
| `DOCENT_PIN` | bijv. je PIN |
| `DATABASE_URL` | Neon Postgres (optioneel; zonder dit blijven stats niet bewaard) |

Daarna **Redeploy**. Production, Preview en Development allemaal aanvinken.