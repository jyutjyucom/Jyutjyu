let heiPromise: Promise<unknown> | null = null
let sungPromise: Promise<unknown> | null = null

export function useChironHeiContentFont() {
  const ensureLoaded = () => {
    if (import.meta.server) return Promise.resolve()
    if (!heiPromise) heiPromise = import('~/styles/chiron-hei-content.css')
    return heiPromise
  }
  return { ensureLoaded }
}

export function useChironSungContentFont() {
  const ensureLoaded = () => {
    if (import.meta.server) return Promise.resolve()
    if (!sungPromise) sungPromise = import('~/styles/chiron-sung-content.css')
    return sungPromise
  }
  return { ensureLoaded }
}

export function useWarmContentFonts() {
  const hei = useChironHeiContentFont()
  const sung = useChironSungContentFont()
  return () => {
    void hei.ensureLoaded()
    void sung.ensureLoaded()
  }
}
