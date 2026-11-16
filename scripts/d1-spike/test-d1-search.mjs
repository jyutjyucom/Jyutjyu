import { d1 } from "./node-d1-shim.mjs";
import { searchEntriesFromD1 } from "../../server/utils/d1-search.ts";

for (const item of [
  { query: "香港", limit: 10 },
  { query: "唔該", limit: 10 },
  { query: "hoeng1 gong2", limit: 10 },
  { query: "城市", mode: "reverse", limit: 10 },
]) {
  const started = performance.now();
  const response = await searchEntriesFromD1(d1, {
    query: item.query,
    mode: item.mode || "normal",
    limit: item.limit,
  });
  const ms = (performance.now() - started).toFixed(1);
  console.log(
    item.query.padEnd(14),
    "groups:", response.groups.length,
    "| top:", response.groups.slice(0, 3).map((g) => g.key.split("||")[0]).join("/"),
    "|", ms + "ms",
  );
}
