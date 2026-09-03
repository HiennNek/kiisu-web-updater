const GITHUB_API = 'https://api.github.com'

interface Env {
  GITHUB_TOKEN: string
  CACHE_TTL: number
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const path = '/repos/HiennNek/kiisu-unlshd/releases/latest'

    const cacheUrl = new URL(request.url)
    cacheUrl.search = ''
    const cacheKey = new Request(cacheUrl.toString(), request)

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
}
