/**
 * Pictures from the dashboard are served by the API. The store reaches them
 * through its own /media path (see next.config.ts), so they are optimized as
 * local images and never need the API host allowed.
 */
export function mediaSrc(url: string) {
  const match = url.match(/\/api\/media\/([0-9a-f]{32})$/)
  return match ? `/media/${match[1]}` : url
}
