/** A readable device description from a browser's user agent string. */
export function describeDevice(userAgent: string | null | undefined) {
  const ua = userAgent ?? ''
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser\//.test(ua) ? 'Samsung Internet'
    : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null
  const os =
    /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : null
  const mobile = /Mobi|iPhone|Android(?!.*Tablet)/.test(ua) && !/iPad/.test(ua)
  const tablet = /iPad|Tablet/.test(ua)

  return {
    name: browser && os ? `${browser} di ${os}` : (browser ?? os ?? 'Perangkat tidak dikenal'),
    kind: (mobile ? 'phone' : tablet ? 'tablet' : 'computer') as 'phone' | 'tablet' | 'computer',
  }
}
