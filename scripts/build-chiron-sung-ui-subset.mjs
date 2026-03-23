import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outputDir = resolve(projectRoot, 'public/fonts')
const outputFontPath = resolve(outputDir, 'chiron-sung-hk-ui.woff2')
const outputItalicFontPath = resolve(outputDir, 'chiron-sung-hk-ui-italic.woff2')
const cacheDir = resolve(projectRoot, 'node_modules/.cache/chiron-sung-hk-ui')
const normalFontPath = resolve(cacheDir, 'ChironSungHK[wght].ttf')
const italicFontPath = resolve(cacheDir, 'ChironSungHK-Italic[wght].ttf')
const charsPath = resolve(cacheDir, 'chars.txt')
const includeExtensions = new Set(['.json', '.js', '.mjs', '.ts', '.vue'])
const sourceRoots = [
  resolve(projectRoot, 'app.vue'),
  resolve(projectRoot, 'components'),
  resolve(projectRoot, 'content'),
  resolve(projectRoot, 'error.vue'),
  resolve(projectRoot, 'locales'),
  resolve(projectRoot, 'pages')
]
const uiCharPattern = /[\u0020-\u007E\u00A0-\u00FF\u2000-\u206F\u3000-\u303F\u3100-\u312F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/gu
const fontSources = [
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/chironsunghk/ChironSungHK%5Bwght%5D.ttf',
    path: normalFontPath
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/chironsunghk/ChironSungHK-Italic%5Bwght%5D.ttf',
    path: italicFontPath
  }
]

const walkFiles = (inputPath) => {
  if (!existsSync(inputPath)) {
    return []
  }

  const stats = statSync(inputPath)
  if (stats.isFile()) {
    return includeExtensions.has(extname(inputPath)) ? [inputPath] : []
  }

  if (!stats.isDirectory()) {
    return []
  }

  return readdirSync(inputPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(inputPath, entry.name)
    if (entry.isDirectory()) {
      return walkFiles(fullPath)
    }
    return includeExtensions.has(extname(fullPath)) ? [fullPath] : []
  })
}

const sourceFiles = sourceRoots.flatMap(walkFiles)
const uiCharacters = new Set()

sourceFiles.forEach((filePath) => {
  const content = readFileSync(filePath, 'utf8')
  const matches = content.match(uiCharPattern)
  if (!matches) return
  matches.forEach((char) => uiCharacters.add(char))
})

const chars = [...uiCharacters].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('')

if (!chars) {
  console.error('搵唔到任何可以生成 Chiron Sung UI 子集嘅字元。')
  process.exit(1)
}

mkdirSync(outputDir, { recursive: true })
mkdirSync(cacheDir, { recursive: true })
writeFileSync(charsPath, chars)

const pyftsubsetCheck = spawnSync('pyftsubset', ['--help'], {
  cwd: projectRoot,
  encoding: 'utf8'
})
const pythonSubsetCheck = spawnSync('python3', ['-m', 'fontTools.subset', '--help'], {
  cwd: projectRoot,
  encoding: 'utf8'
})

const subsetCommand =
  pyftsubsetCheck.status === 0
    ? { command: 'pyftsubset', args: [] }
    : pythonSubsetCheck.status === 0
      ? { command: 'python3', args: ['-m', 'fontTools.subset'] }
      : null

const hasExistingOutput = existsSync(outputFontPath) && existsSync(outputItalicFontPath)

if (!subsetCommand) {
  if (hasExistingOutput) {
    console.warn('搵唔到 pyftsubset 或 python3 -m fontTools.subset，會沿用現有嘅 Chiron Sung UI 子集字型。')
    process.exit(0)
  }

  console.error('搵唔到 pyftsubset 或 python3 -m fontTools.subset，未能生成 Chiron Sung UI 子集字型。')
  process.exit(1)
}

const downloadFont = async (url, outputPath) => {
  if (existsSync(outputPath)) {
    return
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下載字型失敗: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(outputPath, buffer)
}

try {
  for (const fontSource of fontSources) {
    await downloadFont(fontSource.url, fontSource.path)
  }
} catch (error) {
  if (hasExistingOutput) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`下載 Chiron Sung 原始字型失敗，會沿用現有嘅 UI 子集字型: ${message}`)
    process.exit(0)
  }

  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const buildSubset = (sourceFontPath, destinationPath) => {
  const result = spawnSync(
    subsetCommand.command,
    [
      ...subsetCommand.args,
      sourceFontPath,
      `--text-file=${charsPath}`,
      `--output-file=${destinationPath}`,
      '--flavor=woff2',
      '--layout-features=*'
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8'
    }
  )

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }
}

buildSubset(normalFontPath, outputFontPath)
buildSubset(italicFontPath, outputItalicFontPath)

const normalOutputStats = statSync(outputFontPath)
const italicOutputStats = statSync(outputItalicFontPath)
console.log(
  `已生成 Chiron Sung UI 子集: chars=${uiCharacters.size} normal=${normalOutputStats.size} italic=${italicOutputStats.size}`
)
