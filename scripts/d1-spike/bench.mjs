/**
 * 對 wrangler dev（本地 D1）做壓測，統計 p50/p95 與 D1 rows_read。
 * 用法：node scripts/d1-spike/bench.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://127.0.0.1:8788";
const RUNS = Number(process.env.RUNS || 40);

const cases = [
  { name: "search 香港 (2字)", url: "/search?q=" + encodeURIComponent("香港") + "&limit=20" },
  { name: "search 唔該 (2字)", url: "/search?q=" + encodeURIComponent("唔該") + "&limit=20" },
  { name: "search 香 (1字)", url: "/search?q=" + encodeURIComponent("香") + "&limit=20" },
  { name: "search 冇 (1字)", url: "/search?q=" + encodeURIComponent("冇") + "&limit=20" },
  { name: "search hoeng1 gong2", url: "/search?q=hoeng1%20gong2&limit=20" },
  { name: "reverse 城市", url: "/search?q=" + encodeURIComponent("城市") + "&mode=reverse&limit=20" },
  { name: "reverse 嘅 (worst)", url: "/search?q=" + encodeURIComponent("嘅") + "&mode=reverse&limit=20" },
  { name: "grouped 香港", url: "/grouped?q=" + encodeURIComponent("香港") + "&limit=10" },
  { name: "facets 香港", url: "/facets?q=" + encodeURIComponent("香港") },
  { name: "word 香港", url: "/word?h=" + encodeURIComponent("香港") },
  { name: "browse keyset", url: "/browse?after=" + encodeURIComponent("香") + "&limit=100" },
  { name: "random", url: "/random" },
];

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];

const results = [];
for (const testCase of cases) {
  // warmup
  for (let i = 0; i < 5; i += 1) await fetch(BASE + testCase.url).then((r) => r.text());
  const times = [];
  const d1Times = [];
  const rowsRead = [];
  let bytes = 0;
  let count = 0;
  for (let i = 0; i < RUNS; i += 1) {
    const started = performance.now();
    const response = await fetch(BASE + testCase.url);
    const body = await response.text();
    times.push(performance.now() - started);
    bytes += body.length;
    const d1 = Number(response.headers.get("x-d1-duration") || 0);
    const rows = Number(response.headers.get("x-d1-rows-read") || 0);
    if (Number.isFinite(d1)) d1Times.push(d1);
    if (Number.isFinite(rows)) rowsRead.push(rows);
    try {
      const parsed = JSON.parse(body);
      count = parsed.rows?.length ?? parsed.groups?.length ?? parsed.entries?.length ?? parsed.headwords?.length ?? count;
    } catch {
      // 非 JSON 回應就直接忽略
    }
  }
  times.sort((a, b) => a - b);
  d1Times.sort((a, b) => a - b);
  rowsRead.sort((a, b) => a - b);
  results.push({
    name: testCase.name,
    p50: pct(times, 0.5).toFixed(1),
    p95: pct(times, 0.95).toFixed(1),
    d1p50: d1Times.length ? pct(d1Times, 0.5).toFixed(2) : "-",
    rowsReadP50: rowsRead.length ? pct(rowsRead, 0.5) : "-",
    rowsReadP95: rowsRead.length ? pct(rowsRead, 0.95) : "-",
    resultCount: count,
    kb: (bytes / RUNS / 1024).toFixed(1),
  });
}

console.table(results);
