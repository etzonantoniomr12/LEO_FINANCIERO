import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const outputUrl = new URL('../public/news-feed.json', import.meta.url)
const localPrevious = JSON.parse(await readFile(outputUrl, 'utf8'))
const previous = await readPublishedFeed(localPrevious)

const sources = [
  { category: 'economy', source: 'Gestión', language: 'es', url: 'https://gestion.pe/arc/outboundfeeds/rss/category/economia/?outputType=xml' },
  { category: 'science', source: 'NASA', language: 'en', url: 'https://www.nasa.gov/feed/' },
  { category: 'science', source: 'ScienceDaily', language: 'en', url: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { category: 'ai', source: 'OpenAI', language: 'en', url: 'https://openai.com/news/rss.xml' },
  { category: 'ai', source: 'Google DeepMind', language: 'en', url: 'https://deepmind.google/blog/rss.xml' },
  { category: 'ai', source: 'Hugging Face', language: 'en', url: 'https://huggingface.co/blog/feed.xml' },
  { category: 'ai', source: 'Codex · GitHub', language: 'en', url: 'https://github.com/openai/codex/releases.atom', exclude: /alpha|nightly/i },
  { category: 'ai', source: 'Claude Code · GitHub', language: 'en', url: 'https://github.com/anthropics/claude-code/releases.atom' },
  { category: 'spreadsheets', source: 'Microsoft Excel Blog', language: 'en', url: 'https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=ExcelBlog' },
  { category: 'spreadsheets', source: 'Google Workspace Updates', language: 'en', url: 'https://workspaceupdates.googleblog.com/feeds/posts/default/-/Google%20Sheets' },
]

const htmlSources = [
  { category: 'civil', source: 'ASCE Civil Engineering Source', language: 'en', url: 'https://www.asce.org/publications-and-news/civil-engineering-source', href: /civil-engineering-source\/article\//i, include: /civil|engineer|construct|bridge|concrete|infrastructure|structur|building|transport|geotechn|water|digital|technology|AI/i },
  { category: 'civil', source: 'Constructivo · Perú', language: 'es', url: 'https://constructivo.com/index.php', href: /\/noticia\//i, include: /BIM|tecnolog|robot|metaverso|digital|infraestructura inteligente|ingenier|construcción 3D|innovación/i },
]

const categoryKeys = ['economy', 'science', 'civil', 'civilgeeks', 'nobel', 'ai', 'spreadsheets', 'blog_sc']
const categories = Object.fromEntries(categoryKeys.map((key) => [key, []]))
const results = await Promise.allSettled(sources.map(fetchFeed))
for (const result of results) {
  if (result.status === 'fulfilled') categories[result.value.category].push(...result.value.items)
  else console.warn(result.reason instanceof Error ? result.reason.message : result.reason)
}

const htmlResults = await Promise.allSettled(htmlSources.map(fetchHtmlListing))
for (const result of htmlResults) {
  if (result.status === 'fulfilled') categories[result.value.category].push(...result.value.items)
  else console.warn(result.reason instanceof Error ? result.reason.message : result.reason)
}

try {
  categories.civilgeeks.push(...await fetchCivilGeeks())
} catch (error) {
  console.warn(error instanceof Error ? error.message : error)
}

try {
  categories.nobel.push(...await fetchNobel())
} catch (error) {
  console.warn(error instanceof Error ? error.message : error)
}

try {
  categories.blog_sc.push(...await fetchSolteraCodiciada())
} catch (error) {
  console.warn(error instanceof Error ? error.message : error)
}

const refreshedAt = new Date().toISOString()
const categoryUpdatedAt = {}
let changedAnyCategory = false
for (const category of Object.keys(categories)) {
  const previousItems = previous.categories[category] ?? []
  const unique = [...new Map(categories[category].map((item) => [item.url, item])).values()]
    .sort((a, b) => category === 'blog_sc'
      ? (Date.parse(a.publishedAt) || 0) - (Date.parse(b.publishedAt) || 0)
      : (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
    .slice(0, category === 'blog_sc' ? 200 : 12)
  categories[category] = unique.length > 0 ? unique : previousItems
  const changed = JSON.stringify(categories[category]) !== JSON.stringify(previousItems)
  changedAnyCategory ||= changed
  categoryUpdatedAt[category] = changed
    ? refreshedAt
    : previous.categoryUpdatedAt?.[category] ?? previous.updatedAt ?? refreshedAt
}

const updatedAt = changedAnyCategory ? refreshedAt : previous.updatedAt ?? refreshedAt
await writeFile(outputUrl, `${JSON.stringify({ updatedAt, categoryUpdatedAt, categories }, null, 2)}\n`)
console.log(Object.entries(categories).map(([key, items]) => `${key}: ${items.length}`).join('\n'))

async function readPublishedFeed(fallback) {
  const url = process.env.NEWS_FEED_URL || 'https://etzonantoniomr12.github.io/LEO_FINANCIERO/news-feed.json'
  try {
    const response = await fetch(`${url}?baseline=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return fallback
    const feed = await response.json()
    return feed?.categories ? feed : fallback
  } catch {
    return fallback
  }
}

async function fetchFeed(config) {
  const xml = await fetchText(config.url)
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0])
  const items = blocks.map((block) => parseItem(block, config)).filter((item) => {
    const searchable = `${item.title} ${item.summary}`
    return item.title && item.url && (!config.include || config.include.test(searchable)) && (!config.exclude || !config.exclude.test(searchable))
  })
  if (items.length === 0) throw new Error(`Sin artículos válidos en ${config.source}`)
  return { category: config.category, items: items.slice(0, 8) }
}

function parseItem(block, config) {
  const title = textTag(block, 'title')
  const url = textTag(block, 'link') || attribute(block, 'link', 'href') || textTag(block, 'guid')
  const rawSummary = textTag(block, 'description') || textTag(block, 'summary') || textTag(block, 'content:encoded') || textTag(block, 'content')
  const publishedAt = textTag(block, 'pubDate') || textTag(block, 'published') || textTag(block, 'updated') || new Date().toISOString()
  const imageUrl = attribute(block, 'media:content', 'url') || attribute(block, 'media:thumbnail', 'url') || attribute(block, 'enclosure', 'url') || firstImage(rawSummary)
  return {
    id: createHash('sha1').update(`${config.source}:${url}`).digest('hex').slice(0, 16),
    title: clean(title, 180),
    summary: clean(rawSummary, 360),
    source: config.source,
    url: decode(url),
    publishedAt: validDate(publishedAt),
    ...(imageUrl ? { imageUrl: decode(imageUrl) } : {}),
    language: config.language,
  }
}

async function fetchNobel() {
  const year = new Date().getUTCFullYear()
  const response = await fetchJson(`https://api.nobelprize.org/2.1/nobelPrizes?nobelPrizeYear=${year - 1}&limit=20`)
  return (response.nobelPrizes ?? []).map((prize) => {
    const names = (prize.laureates ?? []).map((laureate) => laureate.knownName?.en || laureate.fullName?.en).filter(Boolean).join(', ')
    const motivation = (prize.laureates ?? []).map((laureate) => laureate.motivation?.en).filter(Boolean).join(' ')
    const slug = ({ Chemistry: 'chemistry', Physics: 'physics', 'Physiology or Medicine': 'medicine', Literature: 'literature', Peace: 'peace', 'Economic Sciences': 'economic-sciences' })[prize.category?.en]
    const url = slug ? `https://www.nobelprize.org/prizes/${slug}/${prize.awardYear}/summary/` : 'https://www.nobelprize.org/prizes/'
    return {
      id: createHash('sha1').update(`nobel:${prize.awardYear}:${prize.category?.en}`).digest('hex').slice(0, 16),
      title: `${prize.category?.en ?? 'Nobel Prize'} ${prize.awardYear}: ${names}`,
      summary: clean(motivation || prize.topMotivation?.en || 'Explore the official motivation and the work recognised by the Nobel Prize.', 360),
      source: 'NobelPrize.org', url, publishedAt: `${prize.awardYear}-10-01T12:00:00.000Z`, language: 'en',
    }
  })
}

async function fetchSolteraCodiciada() {
  const posts = []
  let page = 1
  let found = 1
  while (posts.length < found && page <= 5) {
    const url = `https://public-api.wordpress.com/rest/v1.1/sites/solteracodiciada.com/posts/?number=100&page=${page}&order=ASC&order_by=date&fields=ID,title,URL,date,excerpt,featured_image`
    const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'LEO-Financiero-News/1.0' }, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`${response.status} al consultar Soltera Codiciada`)
    const data = await response.json()
    found = Number(data.found ?? 0)
    posts.push(...(data.posts ?? []))
    page += 1
  }
  if (posts.length === 0) throw new Error('Sin publicaciones válidas en Soltera Codiciada')
  return posts.map((post) => ({
    id: `blog-sc-${post.ID}`,
    title: clean(post.title ?? '', 180),
    summary: clean(post.excerpt ?? '', 360),
    source: 'Soltera Codiciada',
    url: post.URL?.replace(/^http:/, 'https:'),
    publishedAt: validDate(post.date),
    ...(post.featured_image ? { imageUrl: post.featured_image.replace(/^http:/, 'https:') } : {}),
    language: 'es',
  })).filter((post) => post.title && post.url)
}

async function fetchCivilGeeks() {
  try {
    const url = 'https://civilgeeks.com/wp-json/wp/v2/posts?categories=198&per_page=12&_embed'
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'LEO-Financiero-News/1.0 (+https://github.com/etzonantoniomr12/LEO_FINANCIERO)' },
      signal: AbortSignal.timeout(20_000),
    })
    if (response.ok) {
      const posts = await response.json()
      if (Array.isArray(posts) && posts.length > 0) {
        return posts.map((post) => {
          const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
          return {
            id: createHash('sha1').update(`civilgeeks:${post.id}`).digest('hex').slice(0, 16),
            title: clean(post.title?.rendered ?? '', 180),
            summary: clean(post.excerpt?.rendered ?? '', 360),
            source: 'CivilGeeks',
            url: decode(post.link ?? '').replace(/^http:/, 'https:'),
            publishedAt: validDate(post.date_gmt ? `${post.date_gmt}Z` : post.date),
            ...(imageUrl ? { imageUrl: decode(imageUrl).replace(/^http:/, 'https:') } : {}),
            language: 'es',
          }
        }).filter((item) => item.title && item.url)
      }
    }
  } catch (error) {
    console.warn('WP REST API CivilGeeks no disponible, usando RSS...', error instanceof Error ? error.message : error)
  }

  const fallback = await fetchFeed({
    category: 'civilgeeks',
    source: 'CivilGeeks',
    language: 'es',
    url: 'https://civilgeeks.com/categor%C3%ADa/drenaje/feed/',
  })
  return fallback.items
}

async function fetchHtmlListing(config) {
  const html = await fetchText(config.url)
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match, index) => {
      const url = new URL(decode(match[1]), config.url).href
      const title = clean(match[2], 180)
      const dateMatch = url.match(/\/article\/(\d{4})\/(\d{2})\/(\d{2})\//)
      const publishedAt = dateMatch ? new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00Z`).toISOString() : ''
      return {
        id: createHash('sha1').update(`${config.source}:${url}`).digest('hex').slice(0, 16),
        title,
        summary: config.language === 'es' ? 'Conoce el avance, el proyecto y la tecnología descritos por la fuente especializada.' : 'Read the original engineering report to understand the project, technology and practical implications.',
        source: config.source, url, publishedAt, language: config.language,
      }
    })
    .filter((item) => config.href.test(item.url) && config.include.test(item.title) && item.title.length >= 24)
  const candidates = [...new Map(links.map((item) => [item.url, item])).values()].slice(0, 12)
  const items = await Promise.all(candidates.map(enrichHtmlItem))
  if (items.length === 0) throw new Error(`Sin artículos válidos en ${config.source}`)
  return { category: config.category, items }
}

async function enrichHtmlItem(item) {
  try {
    const html = await fetchText(item.url)
    const title = clean(meta(html, 'og:title') || item.title, 180)
    const summary = clean(meta(html, 'og:description') || meta(html, 'description') || item.summary, 360)
    const imageUrl = meta(html, 'og:image')
    const published = meta(html, 'article:published_time')
    return { ...item, title, summary, ...(imageUrl ? { imageUrl } : {}), ...(published ? { publishedAt: validDate(published) } : {}) }
  } catch {
    return item
  }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'LEO-Financiero-News/1.0 (+https://github.com/etzonantoniomr12/LEO_FINANCIERO)' }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${response.status} al consultar ${url}`)
  return response.text()
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'LEO-Financiero-News/1.0' }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${response.status} al consultar NobelPrize.org`)
  return response.json()
}

function textTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() ?? ''
}

function attribute(block, tag, name) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*\\b${name}=["']([^"']+)["'][^>]*>`, 'i'))
  return match?.[1] ?? ''
}

function firstImage(value) {
  return value.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1] ?? ''
}

function meta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const forward = html.match(new RegExp(`<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'))
  const reverse = html.match(new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, 'i'))
  return decode(forward?.[1] || reverse?.[1] || '')
}

function clean(value, limit) {
  const text = decode(value
    .replace(/The post\b[\s\S]*?appeared first on\s*CivilGeeks\.com\s*\.?/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}

function decode(value) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function validDate(value) {
  const date = new Date(decode(value))
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}
