/**
 * Gedeelde stofkaart NaSk1 VMBO GT.
 * Zelfde id's als ToetsGPT-examenstof, plus SE4.1–4.4.
 * Geen leerlingdata. Andere apps mogen dit bestand overnemen.
 */

export type SeCode = "SE4.1" | "SE4.2" | "SE4.3" | "SE4.4" | "vaardigheid" | "se-only";

export type Doel = {
  id: string;
  label: string;
  se: SeCode;
  ce: string | null;
  keywords: string[];
  fout: string;
  tip: string;
};

export const STOFKAART_VERSIE = "2026-10-05";

export const DOELEN: Doel[] = [
  {
    id: "k3-grootheden",
    label: "Grootheden en eenheden",
    se: "vaardigheid",
    ce: "K/3",
    keywords: ["grootheid", "eenheid", "omrekenen", "voorvoegsel", "prefix"],
    fout: "De eenheid blijft staan of je rekent kilo en milli door elkaar.",
    tip: "Schrijf eerst de grootheid, dan de eenheid. Kijk of het kilo, centi of milli is.",
  },
  {
    id: "k3-formules",
    label: "Formules",
    se: "vaardigheid",
    ce: "K/3",
    keywords: ["formule", "herleiden", "invullen"],
    fout: "Je vult de getallen in de verkeerde grootheid in.",
    tip: "Schrijf de formule, zet eronder wat je weet, en wat je zoekt.",
  },
  {
    id: "k3-grafiek",
    label: "Tabellen en grafieken",
    se: "vaardigheid",
    ce: "K/3",
    keywords: ["grafiek aflezen", "tabel", "assen", "diagram aflezen"],
    fout: "Je leest de verkeerde as af.",
    tip: "Kijk eerst welke grootheid op de liggende as staat.",
  },
  {
    id: "k3-onderzoek",
    label: "Onderzoek",
    se: "vaardigheid",
    ce: "K/3",
    keywords: ["onderzoek", "meting", "conclusie", "ontwerp"],
    fout: "De conclusie is een mening en geen antwoord op de onderzoeksvraag.",
    tip: "Herhaal de vraag en geef alleen een antwoord dat uit de meting komt.",
  },
  {
    id: "k3-bronnen",
    label: "Tekst lezen",
    se: "vaardigheid",
    ce: "K/3",
    keywords: ["vaktekst", "bron", "alinea", "leesvraag"],
    fout: "Je slaat de tekst over en gokt de som.",
    tip: "Zoek de zin die bij de vraag hoort. Noem de plek.",
  },
  {
    id: "k4-materialen",
    label: "Materialen",
    se: "SE4.2",
    ce: "K/4",
    keywords: ["materiaal", "kunststof", "corrosie", "geleiding van warmte"],
    fout: "Je noemt een eigenschap die niet bij de vraag hoort.",
    tip: "Welke eigenschap vraagt de opdracht: sterk, licht, geleidend of roest?",
  },
  {
    id: "k4-dichtheid",
    label: "Dichtheid",
    se: "SE4.2",
    ce: "K/4",
    keywords: ["dichtheid", "drijven", "zinken", "zweven", "rho", "massa/volume"],
    fout: "Massa en gewicht worden door elkaar gehaald, of je deelt volume door massa.",
    tip: "Dichtheid is massa gedeeld door volume. Vergelijk daarna met water.",
  },
  {
    id: "k4-stoffeigenschappen",
    label: "Stofeigenschappen",
    se: "SE4.2",
    ce: "K/4",
    keywords: ["smeltpunt", "kookpunt", "fase", "oplosbaarheid"],
    fout: "Smelten en oplossen worden hetzelfde genoemd.",
    tip: "Smelten is dezelfde stof, vloeibaar. Oplossen is mengen met een andere stof.",
  },
  {
    id: "k4-veiligheid",
    label: "Veiligheid",
    se: "SE4.2",
    ce: "K/4",
    keywords: ["pictogram", "giftig", "bijtend", "brandbaar"],
    fout: "Het pictogram wordt geraden aan de kleur.",
    tip: "Kijk naar het teken in het pictogram, niet alleen naar de kleur.",
  },
  {
    id: "k4-milieu",
    label: "Milieu",
    se: "SE4.2",
    ce: "K/4",
    keywords: ["recycling", "afval scheiden", "duurzaam"],
    fout: "Je noemt een maatregel die niet bij dit afval past.",
    tip: "Welk materiaal is het? Daar hoort één manier van scheiden bij.",
  },
  {
    id: "k5-kring",
    label: "Stroomkring",
    se: "SE4.3",
    ce: "K/5",
    keywords: ["serie", "parallel", "stroomkring", "schakeling", "gesloten kring"],
    fout: "Serie en parallel worden verwisseld.",
    tip: "Eén pad is serie. Twee paden naast elkaar is parallel.",
  },
  {
    id: "k5-componenten",
    label: "Symbolen",
    se: "SE4.3",
    ce: "K/5",
    keywords: ["symbool", "schakelaar", "led", "schema", "stroommeter", "spanningsmeter"],
    fout: "De stroommeter en de spanningsmeter staan op de verkeerde plek.",
    tip: "Stroommeter in de kring. Spanningsmeter over het apparaat.",
  },
  {
    id: "k5-ohms",
    label: "Spanning, stroom, weerstand",
    se: "SE4.3",
    ce: "K/5",
    keywords: ["spanning", "stroomsterkte", "weerstand", "ohm", "volt", "ampère", "ampere", "u = i"],
    fout: "Je deelt of vermenigvuldigt de verkeerde twee grootheden.",
    tip: "Schrijf U = I × R. Zet volt, ampère en ohm erbij voor je rekent.",
  },
  {
    id: "k5-vermogen",
    label: "Vermogen en kWh",
    se: "SE4.3",
    ce: "K/5",
    keywords: ["vermogen", "watt", "kwh", "kilowattuur", "p = u"],
    fout: "kWh en watt worden dezelfde eenheid genoemd.",
    tip: "Watt is vermogen. kWh is energie: vermogen keer tijd.",
  },
  {
    id: "k5-beveiliging",
    label: "Beveiliging",
    se: "SE4.3",
    ce: "K/5",
    keywords: ["zekering", "aardlek", "randaarde", "groepenkast"],
    fout: "De zekering en de aardlekschakelaar doen hetzelfde in je antwoord.",
    tip: "De zekering bewaakt te veel stroom. De aardlek bewaakt lekstroom.",
  },
  {
    id: "k6-transport",
    label: "Warmtetransport",
    se: "SE4.2",
    ce: "K/6",
    keywords: ["geleiding", "stroming", "straling", "warmtetransport"],
    fout: "Straling, stroming en geleiding worden één woord: warmte.",
    tip: "Waar gaat de warmte doorheen: een stof, bewegende lucht, of zonder stof ertussen?",
  },
  {
    id: "k6-temperatuur",
    label: "Temperatuur",
    se: "SE4.2",
    ce: "K/6",
    keywords: ["celsius", "kelvin", "thermometer", "temperatuur"],
    fout: "Een stijging van 10 graden wordt een temperatuur van 10 graden.",
    tip: "Kijk of de vraag om een temperatuur vraagt of om een verschil.",
  },
  {
    id: "k6-isolatie",
    label: "Isolatie",
    se: "SE4.2",
    ce: "K/6",
    keywords: ["isolatie", "dubbel glas", "spouw", "isoleerkan"],
    fout: "Isolatie maakt warmte. Dat is niet zo.",
    tip: "Isolatie remt het weglekken van warmte. Het stopt het niet helemaal.",
  },
  {
    id: "k6-energie",
    label: "Rendement",
    se: "SE4.2",
    ce: "K/6",
    keywords: ["rendement", "nuttige energie", "energieomzetting"],
    fout: "Rendement wordt groter dan 100 procent, of je deelt de verkeerde kant op.",
    tip: "Nuttig gedeeld door erin, keer 100. Nooit meer dan alles.",
  },
  {
    id: "k8-toon",
    label: "Toonhoogte",
    se: "SE4.2",
    ce: "K/8",
    keywords: ["frequentie", "toonhoogte", "hertz", "trilling"],
    fout: "Hoge toon en hard geluid worden hetzelfde.",
    tip: "Toonhoogte is frequentie in hertz. Hard gaat over decibel.",
  },
  {
    id: "k8-sterkte",
    label: "Geluidssterkte",
    se: "SE4.2",
    ce: "K/8",
    keywords: ["decibel", "geluidssterkte", "lawaai"],
    fout: "Twee bronnen van 50 dB worden 100 dB.",
    tip: "Decibel tel je niet zomaar op. Kijk wat de vraag echt vraagt.",
  },
  {
    id: "k8-snelheid",
    label: "Geluidssnelheid",
    se: "SE4.2",
    ce: "K/8",
    keywords: ["echo", "geluidssnelheid", "voortplanting"],
    fout: "Bij een echo tel je de afstand maar één keer.",
    tip: "Een echo gaat heen en terug. De afstand tot de muur is de helft.",
  },
  {
    id: "k8-gehoor",
    label: "Gehoor",
    se: "SE4.2",
    ce: "K/8",
    keywords: ["gehoor", "oorbescherming", "gehoorschade"],
    fout: "Alleen heel hard geluid zou schadelijk zijn, tijd telt niet.",
    tip: "Kijk naar sterkte én hoe lang je het hoort.",
  },
  {
    id: "k9-soorten",
    label: "Krachten",
    se: "SE4.1",
    ce: "K/9",
    keywords: ["zwaartekracht", "wrijving", "normaalkracht", "spankracht", "newton", "krachtpijl"],
    fout: "De pijl begint op de verkeerde plek of wijst de verkeerde kant op.",
    tip: "Zwaartekracht vanuit het midden omlaag. Normaalkracht vanaf het vlak omhoog.",
  },
  {
    id: "k9-druk",
    label: "Druk",
    se: "SE4.1",
    ce: "K/9",
    keywords: ["druk", "pascal", "oppervlak", "n/m"],
    fout: "Een groter oppervlak geeft in je antwoord meer druk.",
    tip: "Druk is kracht gedeeld door oppervlak. Groter vlak, kleinere druk.",
  },
  {
    id: "k9-hefboom",
    label: "Hefboom en katrol",
    se: "SE4.1",
    ce: "K/9",
    keywords: ["hefboom", "katrol", "moment", "lastarm", "machtarm"],
    fout: "De arm is de schuine lat, niet de loodrechte afstand.",
    tip: "De arm is de kortste afstand van het draaipunt tot de werklijn.",
  },
  {
    id: "k9-snelheid",
    label: "Snelheid",
    se: "SE4.4",
    ce: "K/9",
    keywords: ["gemiddelde snelheid", "m/s", "km/h", "snelheid"],
    fout: "km/h en m/s blijven door elkaar in de formule staan.",
    tip: "Zet alles eerst in meter en seconde, of alles in km en uur.",
  },
  {
    id: "k9-diagram",
    label: "s,t- en v,t-diagram",
    se: "SE4.4",
    ce: "K/9",
    keywords: ["s,t", "v,t", "s-t", "v-t", "afstand-tijd", "snelheid-tijd"],
    fout: "Een horizontale lijn in een s,t-diagram wordt stilstand genoemd, of juist snelheid.",
    tip: "Eerst de assen lezen. Stilstand in een s,t-diagram is een horizontale lijn.",
  },
  {
    id: "v1-botsing",
    label: "Remweg",
    se: "SE4.4",
    ce: "V/1",
    keywords: ["remweg", "reactieafstand", "stopafstand", "botsing"],
    fout: "Stopafstand is alleen de remweg.",
    tip: "Stopafstand = reactieafstand + remweg.",
  },
  {
    id: "v1-veiligheid",
    label: "Veiligheid in het verkeer",
    se: "SE4.4",
    ce: "V/1",
    keywords: ["gordel", "airbag", "kreukelzone", "helm"],
    fout: "De kreukelzone maakt de botsing harder.",
    tip: "De kreukelzone maakt de tijd van de botsing langer, de kracht kleiner.",
  },
  {
    id: "v1-energie",
    label: "Bewegingsenergie",
    se: "SE4.4",
    ce: "V/1",
    keywords: ["bewegingsenergie", "kinetisch", "arbeid"],
    fout: "Dubbele snelheid wordt dubbele energie.",
    tip: "Snelheid telt dubbel mee. Eerst kijken of de formule een kwadraat heeft.",
  },
  {
    id: "v2-krachten",
    label: "Krachten in een constructie",
    se: "SE4.1",
    ce: "V/2",
    keywords: ["trek", "druk in een balk", "spankracht in een brug"],
    fout: "Trek en druk zitten aan dezelfde kant van de balk.",
    tip: "Kijk waar de balk wordt uitgerekt en waar hij wordt samengedrukt.",
  },
  {
    id: "v2-moment",
    label: "Moment en evenwicht",
    se: "SE4.1",
    ce: "V/2",
    keywords: ["zwaartepunt", "massamiddelpunt", "evenwicht"],
    fout: "Het zwaartepunt wordt op het steunpunt gezet zonder te kijken.",
    tip: "Teken eerst het zwaartepunt. Kijk daarna of de steun daar recht onder zit.",
  },
  {
    id: "v2-context",
    label: "Bruggen en ophanging",
    se: "SE4.1",
    ce: "V/2",
    keywords: ["brug", "ophanging", "constructie"],
    fout: "Elke staaf in de brug krijgt dezelfde soort kracht.",
    tip: "Kijk per staaf: wordt hij langer getrokken of korter gedrukt?",
  },
  {
    id: "v4-samenhang",
    label: "Stof combineren",
    se: "vaardigheid",
    ce: "V/4",
    keywords: ["samenhang", "meerdere onderdelen"],
    fout: "Je gebruikt maar één formule terwijl de vraag twee stappen heeft.",
    tip: "Knip de vraag in twee zinnen. Welke twee grootheden horen bij elkaar?",
  },
  {
    id: "k7-licht",
    label: "Licht",
    se: "se-only",
    ce: null,
    keywords: ["spiegel", "lens", "lichtstraal", "schaduw"],
    fout: "De hoek wordt vanaf de spiegel gemeten in plaats van vanaf de normaal.",
    tip: "Teken eerst de normaal, loodrecht op de spiegel.",
  },
  {
    id: "k10-bouw",
    label: "Bouw van de materie",
    se: "se-only",
    ce: null,
    keywords: ["atoom", "molecuul", "deeltje"],
    fout: "Een molecuul en een atoom zijn in je antwoord hetzelfde.",
    tip: "Een molecuul is opgebouwd uit atomen.",
  },
  {
    id: "k11-straling",
    label: "Straling",
    se: "se-only",
    ce: null,
    keywords: ["straling", "radioactief", "röntgen", "alfastraling"],
    fout: "Elke straling gaat even ver door materiaal.",
    tip: "Kijk welk type het is en wat het tegenhoudt.",
  },
  {
    id: "k12-weer",
    label: "Het weer",
    se: "se-only",
    ce: null,
    keywords: ["neerslag", "luchtvochtigheid", "luchtdruk", "wind"],
    fout: "Hoge luchtdruk wordt automatisch regen.",
    tip: "Lees in de tekst wat de druk en de bewolking doen.",
  },
];

export function doelById(id: string | null | undefined): Doel | undefined {
  if (!id) return undefined;
  return DOELEN.find((d) => d.id === id);
}

/** Zoek het best passende doel in een leerlingtekst. Geen match bij te weinig signaal. */
export function matchDoel(tekst: string): Doel | undefined {
  const raw = tekst.toLowerCase();
  if (raw.trim().length < 3) return undefined;
  let best: { doel: Doel; score: number } | undefined;
  for (const doel of DOELEN) {
    let score = 0;
    if (raw.includes(doel.label.toLowerCase())) score += 3;
    for (const woord of doel.keywords) {
      if (raw.includes(woord.toLowerCase())) score += woord.length > 8 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { doel, score };
  }
  if (!best || best.score < 1) return undefined;
  return best.doel;
}

export function doelPrompt(doel: Doel | undefined): string {
  if (!doel) return "";
  const ce = doel.ce ? doel.ce : "niet op het CE";
  return `DOEL ${doel.id} · ${doel.label} · ${doel.se} · ${ce}.
Veelgemaakte fout: ${doel.fout}
Gebruik die fout als tip in stap 2 of 3. Nooit in stap 1. Noem het eindantwoord niet.`;
}

/** Publieke kaart voor andere apps. Geen foutteksten die een som verklappen, wel id en koppeling. */
export function publiekeStofkaart() {
  return {
    versie: STOFKAART_VERSIE,
    vak: "nask1",
    leerweg: "vmbo-gt",
    doelen: DOELEN.map((d) => ({
      id: d.id,
      label: d.label,
      se: d.se,
      ce: d.ce,
      keywords: d.keywords,
    })),
  };
}
