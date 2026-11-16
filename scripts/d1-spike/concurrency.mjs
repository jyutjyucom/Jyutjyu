const BASE = "http://127.0.0.1:8788";
const url = BASE + "/search?q=" + encodeURIComponent("香港") + "&limit=20";
const times = [];
const started = performance.now();
await Promise.all(Array.from({ length: 50 }, async () => {
  const t0 = performance.now();
  await fetch(url).then(r => r.text());
  times.push(performance.now() - t0);
}));
const wall = performance.now() - started;
times.sort((a,b)=>a-b);
console.log("50 concurrent requests: wall", wall.toFixed(1) + "ms",
  "| p50", times[25].toFixed(1) + "ms",
  "| p95", times[47].toFixed(1) + "ms",
  "| throughput", (50 / (wall/1000)).toFixed(0) + " req/s");
