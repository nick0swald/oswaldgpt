import assert from "node:assert/strict";
import test from "node:test";
import { figuurUitModel, verbodenGetallen } from "./figuur.ts";

test("schakelschema houdt NEN-onderdelen en laat het antwoord uit het label", () => {
  const figuur = figuurUitModel(
    {
      soort: "schakelschema",
      schakeling: "serie",
      bron: "cel",
      onderdelen: [
        { soort: "lamp", label: "L1" },
        { soort: "weerstand", label: "12 ohm" },
      ],
    },
    verbodenGetallen("De weerstand is 12 ohm."),
  );
  assert.equal(figuur?.type, "schakelschema");
  if (figuur?.type !== "schakelschema") return;
  assert.equal(figuur.onderdelen[0]?.label, "L1");
  assert.equal(figuur.onderdelen[1]?.label, "");
});

test("grafiek eist twee punten", () => {
  assert.equal(figuurUitModel({ soort: "grafiek", punten: [{ x: 1, y: 2 }] }), null);
  const figuur = figuurUitModel({
    soort: "grafiek",
    xLabel: "t (s)",
    yLabel: "v (m/s)",
    punten: [
      { x: 0, y: 0 },
      { x: 4, y: 8 },
    ],
    lijn: true,
  });
  assert.equal(figuur?.type, "grafiek");
});

test("geen soort tekent niets", () => {
  assert.equal(figuurUitModel({ soort: "geen" }), null);
});
