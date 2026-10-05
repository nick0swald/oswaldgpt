import assert from "node:assert/strict";
import test from "node:test";
import { matchDoel } from "./stofkaart.ts";

test("serie hoort bij de stroomkring", () => {
  assert.equal(matchDoel("Zitten de lampen in serie of parallel?")?.id, "k5-kring");
});

test("dichtheid wint van het losse woord massa", () => {
  assert.equal(matchDoel("Bereken de dichtheid. Het blok drijft niet.")?.id, "k4-dichtheid");
});

test("te korte tekst heeft geen doel", () => {
  assert.equal(matchDoel("hoi"), undefined);
});
