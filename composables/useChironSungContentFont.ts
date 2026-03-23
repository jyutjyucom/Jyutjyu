let chironSungContentFontPromise: Promise<unknown> | null = null

export function useChironSungContentFont() {
  const ensureLoaded = () => {
    if (import.meta.server) {
      return Promise.resolve()
    }

    if (!chironSungContentFontPromise) {
      chironSungContentFontPromise = import('~/styles/chiron-sung-content.css')
    }

    return chironSungContentFontPromise
  }

  return {
    ensureLoaded
  }
}
