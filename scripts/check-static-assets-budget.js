import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_ASSET_DIR = ".output/public";
const DEFAULT_FILE_BUDGET = 95000;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const countFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(path);
    } else if (entry.isFile()) {
      count += 1;
    } else if (entry.isSymbolicLink()) {
      const info = await stat(path);
      if (info.isFile()) count += 1;
    }
  }

  return count;
};

const assetDir = resolve(
  process.cwd(),
  process.env.STATIC_ASSET_DIR || DEFAULT_ASSET_DIR,
);
const fileBudget = parsePositiveInteger(
  process.env.CLOUDFLARE_STATIC_ASSET_FILE_BUDGET,
  DEFAULT_FILE_BUDGET,
);

try {
  const fileCount = await countFiles(assetDir);
  console.log(`Static asset file count: ${fileCount}/${fileBudget}`);

  if (fileCount > fileBudget) {
    console.error(
      `Static asset file budget exceeded: ${fileCount} files > ${fileBudget}.`,
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Failed to check static asset file budget:", error);
  process.exitCode = 1;
}
