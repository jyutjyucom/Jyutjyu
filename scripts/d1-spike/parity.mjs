const BASE = "http://127.0.0.1:8788";
const PROD = "https://jyutjyu.com";
const queries = [
  { q: "香港", mode: "normal" },
  { q: "唔該", mode: "normal" },
  { q: "香", mode: "normal" },
  { q: "冇", mode: "normal" },
  { q: "得", mode: "normal" },
  { q: "hoeng1 gong2", mode: "normal" },
  { q: "城市", mode: "reverse" },
  { q: "電台", mode: "normal" },
  { q: "食飯", mode: "normal" },
];
const uniq = (arr) => Array.from(new Set(arr));
let top1 = 0, recall5 = 0, recall10 = 0;
for (const item of queries) {
  const suffix = item.mode === "reverse" ? "&mode=reverse" : "";
  const spikeUrl = BASE + "/search?q=" + encodeURIComponent(item.q) + "&limit=80" + suffix;
  const prodUrl = PROD + "/api/search?q=" + encodeURIComponent(item.q) + "&limit=20" + suffix;
  const [spikeRes, prodRes] = await Promise.all([fetch(spikeUrl).then(r => r.json()), fetch(prodUrl).then(r => r.json())]);
  const spikeTop = uniq((spikeRes.rows || []).map(r => r.canon)).slice(0, 10);
  const prodTop = uniq((prodRes.results || []).map(r => r.headword.display)).slice(0, 10);
  const o5 = prodTop.slice(0, 5).filter(x => spikeTop.slice(0, 5).includes(x)).length / Math.max(1, prodTop.slice(0, 5).length);
  const o10 = prodTop.filter(x => spikeTop.includes(x)).length / Math.max(1, prodTop.length);
  if (spikeTop[0] === prodTop[0]) top1 += 1;
  recall5 += o5; recall10 += o10;
  console.log(item.q.padEnd(14), spikeTop[0] === prodTop[0] ? "✓" : "✗",
    "| spike:", spikeTop.slice(0, 4).join("/"),
    "| prod:", prodTop.slice(0, 4).join("/"));
}
console.log("\ntop1", top1 + "/" + queries.length,
  "| top5 recall", (recall5 / queries.length * 100).toFixed(1) + "%",
  "| top10 recall", (recall10 / queries.length * 100).toFixed(1) + "%");
