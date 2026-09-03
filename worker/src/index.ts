const GITHUB_API = 'https://api.github.com'
const DEFAULT_REPO = 'HiennNek/kiisu-unlshd'

interface Env {
  GITHUB_TOKEN: string
  CACHE_TTL: number
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
}

async function fetchRelease(repo: string, env: Env): Promise<Response> {
  const path = `/repos/${repo}/releases/latest`

  const cacheKey = new Request(`https://kiisu-github-proxy/cache/${repo}`)
  const cache = caches.default
  const ttl = env.CACHE_TTL || 300

  let response = await cache.match(cacheKey)

  if (!response) {
    const headers: Record<string, string> = {
      'User-Agent': 'kiisu-web-updater',
      Accept: 'application/vnd.github.v3+json'
    }

    if (env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`
    }

    const ghResponse = await fetch(`${GITHUB_API}${path}`, { headers })
    const body = await ghResponse.text()

    response = new Response(body, {
      status: ghResponse.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttl}`
      }
    })

    await cache.put(cacheKey, response.clone())
  }

  return response
}

async function proxyDownload(downloadUrl: string, env: Env): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': 'kiisu-web-updater'
  }

  if (env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`
  }

  const ghResponse = await fetch(downloadUrl, { headers })

  const responseHeaders: Record<string, string> = {
    ...CORS_HEADERS,
    'Content-Type': ghResponse.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Length': ghResponse.headers.get('Content-Length') || ''
  }

  return new Response(ghResponse.body, {
    status: ghResponse.status,
    headers: responseHeaders
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const downloadUrl = url.searchParams.get('download')
    const repo = url.searchParams.get('repo') || DEFAULT_REPO

    if (downloadUrl) {
      return proxyDownload(downloadUrl, env)
    }

    return fetchRelease(repo, env)
  }
}
