import { d1 } from "./node-d1-shim.mjs";
import { getHeadwordSuggestionsFromD1 } from "../../server/utils/d1-search.ts";

for (const q of ["香", "香港", "唔該", "hoeng1"]) {
  const t = performance.now();
  const out = await getHeadwordSuggestionsFromD1(d1, q, 8);
  console.log(q.padEnd(8), (performance.now() - t).toFixed(1) + "ms", "->", out.join(" / "));
}
