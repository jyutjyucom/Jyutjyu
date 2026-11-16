const BASE = "http://127.0.0.1:8788";
const PROD = "https://jyutjyu.com";
const queries = ["香港","唔該","香","冇","得","電台","食飯","香港人","唔該晒","hoeng1 gong2","城市","好","睇"];
const uniq = (arr) => Array.from(new Set(arr));
let covered = 0, total = 0;
for (const q of queries) {
  const reverse = q === "城市";
  const suffix = reverse ? "&mode=reverse" : "";
  const [spikeRes, prodRes] = await Promise.all([
    fetch(BASE + "/search?q=" + encodeURIComponent(q) + "&limit=2000" + suffix).then(r => r.json()),
    fetch(PROD + "/api/search?q=" + encodeURIComponent(q) + "&limit=20" + suffix).then(r => r.json()),
  ]);
  const pool = new Set((spikeRes.rows || []).map(r => r.canon));
  const prodTop = uniq((prodRes.results || []).map(r => r.headword.display)).slice(0, 10);
  const inPool = prodTop.filter(x => pool.has(x)).length / Math.max(1, prodTop.length);
  covered += inPool; total += 1;
  console.log(q.padEnd(12), "matchPool", String(pool.size).padStart(5), "| prodTop10 covered", (inPool*100).toFixed(0) + "%");
}
console.log("\nmean coverage of prod top-10 in full match pool:", (covered/total*100).toFixed(1) + "%");
