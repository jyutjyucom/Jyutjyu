const BASE = "http://127.0.0.1:8788";
const PROD = "https://jyutjyu.com";
const queries = ["香港","唔該","香","冇","得","電台","食飯","香港人","唔該晒"," hoeng1 gong2","城市","好","睇"];
const uniq = (arr) => Array.from(new Set(arr));
let hit50 = 0, hit200 = 0, total = 0;
for (const raw of queries) {
  const q = raw.trim();
  const reverse = q === "城市";
  const suffix = reverse ? "&mode=reverse" : "";
  const [spikeRes, prodRes] = await Promise.all([
    fetch(BASE + "/search?q=" + encodeURIComponent(q) + "&limit=200" + suffix).then(r => r.json()),
    fetch(PROD + "/api/search?q=" + encodeURIComponent(q) + "&limit=20" + suffix).then(r => r.json()),
  ]);
  const spikeAll = uniq((spikeRes.rows || []).map(r => r.canon));
  const prodTop = uniq((prodRes.results || []).map(r => r.headword.display)).slice(0, 10);
  const in50 = prodTop.filter(x => spikeAll.slice(0, 50).includes(x)).length / Math.max(1, prodTop.length);
  const in200 = prodTop.filter(x => spikeAll.slice(0, 200).includes(x)).length / Math.max(1, prodTop.length);
  hit50 += in50; hit200 += in200; total += 1;
  console.log(q.padEnd(12), "prodTop", prodTop.length, "| spike uniq", spikeAll.length,
    "| recall@50", (in50*100).toFixed(0)+"%", "| recall@200", (in200*100).toFixed(0)+"%");
}
console.log("\nmean recall@50", (hit50/total*100).toFixed(1)+"%", "| mean recall@200", (hit200/total*100).toFixed(1)+"%");
