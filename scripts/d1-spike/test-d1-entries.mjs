import { d1 } from "./node-d1-shim.mjs";
import {
  getEntryByIdFromD1,
  getDictionaryStatsFromD1,
  findEntriesByForms,
} from "../../server/utils/d1-entries.ts";

const entry = await getEntryByIdFromD1(d1, "hk-cantowords_000278");
console.log("entry:", entry?.headword?.display, "| senses:", entry?.senses?.length);

const stats = await getDictionaryStatsFromD1(d1);
console.log("total:", stats.totalEntries, "| dicts:", stats.dictionaries.length);
console.log("top:", stats.dictionaries.slice(0, 3).map((d) => d.name + "=" + d.entries_count).join(" | "));

for (const forms of [["香港"], ["唔該", "唔该"], ["過鐘", "过钟"], ["hoeng1 gong2"]]) {
  const started = performance.now();
  const entries = await findEntriesByForms(d1, forms);
  console.log(
    "forms", JSON.stringify(forms),
    "->", entries.length, "entries, uniq canon",
    new Set(entries.map((e) => e.headword?.normalized || e.headword?.display)).size,
    "|", (performance.now() - started).toFixed(2) + "ms",
  );
}
