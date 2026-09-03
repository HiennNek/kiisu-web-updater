import { instance } from 'boot/axios'
import { unpack, ungzip } from 'shared/lib/utils/operation'
import type { Channel } from '../model/types'

const WORKER_URL = 'https://kiisu-github-proxy.hiennek.workers.dev'

export const FIRMWARE_ORIGINS = {
  unleashed: {
    id: 'unleashed',
    label: 'Unleashed',
    repo: 'HiennNek/kiisu-unlshd',
    prefix: 'kiisu-unlshd'
  },
  momentum: {
    id: 'momentum',
    label: 'Momentum',
    repo: 'HiennNek/kiisu-mntm',
    prefix: 'kiisu-mntm'
  }
} as const

export type FirmwareOriginId = keyof typeof FIRMWARE_ORIGINS

interface GitHubAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  body: string
  published_at: string
  assets: GitHubAsset[]
}

function extractCommitHash(tgzName: string, prefix: string): string {
  const regex = new RegExp(`${prefix}_([a-f0-9]+)_`)
  const match = tgzName.match(regex)
  return match ? match[1]! : tgzName
}

async function fetchLatestRelease(
  origin: FirmwareOriginId = 'unleashed'
): Promise<GitHubRelease> {
  const repo = FIRMWARE_ORIGINS[origin].repo
  return await instance
    .get(`${WORKER_URL}?repo=${encodeURIComponent(repo)}`)
    .then(({ data }) => data)
}

async function fetchChannels(
  origin: FirmwareOriginId = 'unleashed'
): Promise<Channel[]> {
  const release = await fetchLatestRelease(origin)
  const originConfig = FIRMWARE_ORIGINS[origin]

  const tgzAsset = release.assets.find((a) => a.name.endsWith('.tgz'))
  if (!tgzAsset) {
    throw new Error('No .tgz asset found in latest release')
  }

  const commitHash = extractCommitHash(tgzAsset.name, originConfig.prefix)

  return [
    {
      id: 'release',
      title: originConfig.label,
      description: release.body,
      versions: [
        {
          version: commitHash,
          timestamp: new Date(release.published_at).getTime(),
          changelog: release.body,
          files: [
            {
              url: tgzAsset.browser_download_url,
              type: 'update_tgz',
              target: 'f7',
              sha256: ''
            }
          ]
        }
      ]
    }
  ]
}

function proxyUrl(url: string): string {
  return `${WORKER_URL}?download=${encodeURIComponent(url)}`
}

async function fetchFirmware(url: string) {
  return await instance
    .get(proxyUrl(url), { responseType: 'arraybuffer' })
    .then(async ({ data }) => {
      return unpack(data)
    })
    .catch((error) => {
      const decoder = new TextDecoder('utf-8')
      const data = JSON.parse(decoder.decode(error.response.data)).detail
      if (data.code >= 400) {
        throw new Error('Failed to fetch firmware (' + data.code + ')')
      }
    })
}

async function fetchFirmwareTar(url: string) {
  return await instance
    .get(proxyUrl(url), { responseType: 'arraybuffer' })
    .then(({ data }) => {
      return ungzip(data)
    })
    .catch((error) => {
      const decoder = new TextDecoder('utf-8')
      const data = JSON.parse(decoder.decode(error.response.data)).detail
      if (data.code >= 400) {
        throw new Error('Failed to fetch firmware (' + data.code + ')')
      }
    })
}

export const api = {
  fetchChannels,
  fetchLatestRelease,
  fetchFirmware,
  fetchFirmwareTar
}
