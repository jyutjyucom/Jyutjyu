let chironHeiContentFontPromise: Promise<unknown> | null = null

export function useChironHeiContentFont() {
  const ensureLoaded = () => {
    if (import.meta.server) {
      return Promise.resolve()
    }

    if (!chironHeiContentFontPromise) {
      chironHeiContentFontPromise = import('~/styles/chiron-hei-content.css')
    }

    return chironHeiContentFontPromise
  }

  return {
    ensureLoaded
  }
}
