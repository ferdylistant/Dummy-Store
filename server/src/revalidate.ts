/**
 * Tells the store its cached pages are out of date after the dashboard saves
 * something. Calls within a second are merged into one. A failure only means
 * the store catches up when its cache runs out, so it is logged and ignored.
 */
export function storeRevalidator(options: { url: string; secret: string } | null) {
  if (!options) return () => {}
  let timer: NodeJS.Timeout | undefined
  return () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const response = await fetch(options.url, {
          method: 'POST',
          headers: { 'x-revalidate-secret': options.secret },
          signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) console.warn(`Revalidasi toko gagal: ${response.status}`)
      } catch (error) {
        console.warn('Revalidasi toko gagal:', (error as Error).message)
      }
    }, 1000)
    timer.unref()
  }
}
