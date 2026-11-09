const CACHE_NAME = 'leo-financiero-v7'
const BASE_PATH = new URL(self.registration.scope).pathname
const fromBase = (path = '') => `${BASE_PATH}${path}`
const STATIC_FILES = [
  fromBase('manifest.webmanifest'),
  fromBase('control-money-icon-192.png'),
  fromBase('control-money-icon-512.png'),
  fromBase('mr-etzon-antonio-signature.png'),
  fromBase('news-feed.json'),
  ...['chabuca-granda', 'jose-maria-arguedas', 'maria-rostworowski', 'pedro-paulet', 'tilsa-tsuchiya']
    .flatMap((name) => [fromBase(`banknote-portraits/${name}.png`), fromBase(`banknote-stories/${name}-life.webp`)]),
]

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const indexResponse = await fetch(fromBase('index.html'), { cache: 'no-store' })
  const html = await indexResponse.clone().text()
  const builtAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path.includes('/assets/'))

  await cache.put(BASE_PATH, indexResponse.clone())
  await cache.put(fromBase('index.html'), indexResponse)
  await cache.addAll([...STATIC_FILES, ...builtAssets])
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  const staticAsset = url.pathname.includes('/assets/') || (STATIC_FILES.includes(url.pathname) && !url.pathname.endsWith('/news-feed.json'))
  event.respondWith(staticAsset ? cacheFirst(event.request) : networkFirst(event.request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone())
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') return caches.match(fromBase('index.html'))
    return Response.error()
  }
}
