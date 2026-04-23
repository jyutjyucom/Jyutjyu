import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const GENERATED_MAP_PATH = resolve(
  process.cwd(),
  "server",
  "generated",
  "trad-variant-map.json",
);

const CJK_UNIFIED_START = 0x3400;
const CJK_UNIFIED_END = 0x9fff;

const createConverters = async () => {
  const OpenCC = await import("opencc-js");
  return {
    toSimplified: OpenCC.Converter({ from: "hk", to: "cn" }),
    toTraditional: OpenCC.Converter({ from: "cn", to: "hk" }),
  };
};

const sortVariants = (simplified, variants, toTraditional) => {
  const uniqueVariants = new Set(variants);
  const ordered = [];

  const append = (value) => {
    const normalized = String(value || "").toLowerCase();
    if (!normalized || !uniqueVariants.has(normalized) || ordered.includes(normalized)) {
      return;
    }

    ordered.push(normalized);
  };

  append(simplified);

  const preferredTraditional = String(toTraditional(simplified) || "").toLowerCase();
  if (Array.from(preferredTraditional).length === 1) {
    append(preferredTraditional);
  }

  Array.from(uniqueVariants)
    .sort((left, right) => {
      return (right.codePointAt(0) || 0) - (left.codePointAt(0) || 0);
    })
    .forEach((value) => append(value));

  return ordered;
};

const main = async () => {
  const startTime = process.hrtime.bigint();
  console.log("Building traditional-variant map...");

  const { toSimplified, toTraditional } = await createConverters();
  const tempMap = new Map();

  for (
    let codePoint = CJK_UNIFIED_START;
    codePoint <= CJK_UNIFIED_END;
    codePoint += 1
  ) {
    const char = String.fromCodePoint(codePoint);
    const simplified = String(toSimplified(char) || "").toLowerCase();

    if (Array.from(simplified).length !== 1) {
      continue;
    }

    const variants = tempMap.get(simplified) ?? new Set([simplified]);
    variants.add(char.toLowerCase());
    tempMap.set(simplified, variants);
  }

  const payload = Object.fromEntries(
    Array.from(tempMap.entries())
      .sort(([left], [right]) => left.localeCompare(right, "zh-Hant"))
      .map(([key, values]) => [
        key,
        sortVariants(key, values, toTraditional),
      ]),
  );

  await mkdir(dirname(GENERATED_MAP_PATH), { recursive: true });
  await writeFile(GENERATED_MAP_PATH, JSON.stringify(payload), "utf8");

  const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  console.log(
    [
      "Traditional-variant map built.",
      `output=${GENERATED_MAP_PATH}`,
      `keys=${Object.keys(payload).length}`,
      `elapsed_ms=${elapsedMs.toFixed(1)}`,
    ].join(" "),
  );
};

main().catch((error) => {
  console.error("Failed to build traditional-variant map:", error);
  process.exitCode = 1;
});
