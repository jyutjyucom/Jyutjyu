import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const sourceFontPath = resolve(
  projectRoot,
  "node_modules/@fontsource-variable/chiron-hei-hk/files/chiron-hei-hk-chinese-traditional-wght-normal.woff2",
);
const outputDir = resolve(projectRoot, "public/fonts");
const outputFontPath = resolve(outputDir, "chiron-hei-hk-ui.woff2");
const cacheDir = resolve(projectRoot, "node_modules/.cache/chiron-hei-hk-ui");
const charsPath = resolve(cacheDir, "chars.txt");
const includeExtensions = new Set([".json", ".js", ".mjs", ".ts", ".vue"]);
const sourceRoots = [
  resolve(projectRoot, "app.vue"),
  resolve(projectRoot, "components"),
  resolve(projectRoot, "content"),
  resolve(projectRoot, "error.vue"),
  resolve(projectRoot, "locales"),
  resolve(projectRoot, "pages"),
];
const uiCharPattern =
  /[\u3000-\u303F\u3100-\u312F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/gu;

const walkFiles = (inputPath) => {
  if (!existsSync(inputPath)) {
    return [];
  }

  const stats = statSync(inputPath);
  if (stats.isFile()) {
    return includeExtensions.has(extname(inputPath)) ? [inputPath] : [];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  return readdirSync(inputPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(inputPath, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return includeExtensions.has(extname(fullPath)) ? [fullPath] : [];
  });
};

const sourceFiles = sourceRoots.flatMap(walkFiles);
const uiCharacters = new Set();

sourceFiles.forEach((filePath) => {
  const content = readFileSync(filePath, "utf8");
  const matches = content.match(uiCharPattern);
  if (!matches) return;
  matches.forEach((char) => uiCharacters.add(char));
});

const chars = [...uiCharacters]
  .sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
  .join("");

if (!chars) {
  console.error("搵唔到任何可以生成 UI 子集嘅中文字元。");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });
writeFileSync(charsPath, chars);

const pyftsubsetCheck = spawnSync("pyftsubset", ["--help"], {
  cwd: projectRoot,
  encoding: "utf8",
});
const pythonSubsetCheck = spawnSync(
  "python3",
  ["-m", "fontTools.subset", "--help"],
  {
    cwd: projectRoot,
    encoding: "utf8",
  },
);

const subsetCommand =
  pyftsubsetCheck.status === 0
    ? { command: "pyftsubset", args: [] }
    : pythonSubsetCheck.status === 0
      ? { command: "python3", args: ["-m", "fontTools.subset"] }
      : null;

if (!subsetCommand) {
  if (existsSync(outputFontPath)) {
    console.warn(
      "搵唔到 pyftsubset 或 python3 -m fontTools.subset，會沿用現有嘅 Chiron Hei UI 子集字型。",
    );
    process.exit(0);
  }

  console.error(
    "搵唔到 pyftsubset 或 python3 -m fontTools.subset，未能生成 Chiron Hei UI 子集字型。",
  );
  process.exit(1);
}

const result = spawnSync(
  subsetCommand.command,
  [
    ...subsetCommand.args,
    sourceFontPath,
    `--text-file=${charsPath}`,
    `--output-file=${outputFontPath}`,
    "--flavor=woff2",
    "--layout-features=*",
  ],
  {
    cwd: projectRoot,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const outputStats = statSync(outputFontPath);
console.log(
  `已生成 Chiron Hei UI 子集: chars=${uiCharacters.size} size=${outputStats.size} path=${outputFontPath}`,
);
