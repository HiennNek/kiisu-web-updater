import { instance } from 'boot/axios'
import { unpack, ungzip } from 'shared/lib/utils/operation'
import type { Channel } from '../model/types'

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/HiennNek/kiisu-unlshd/releases/latest'

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

function extractCommitHash(tgzName: string): string {
  const match = tgzName.match(/kiisu-unlshd_([a-f0-9]+)_/)
  return match ? match[1]! : tgzName
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  return await instance
    .get(GITHUB_RELEASES_URL)
    .then(({ data }) => data)
}

async function fetchChannels(): Promise<Channel[]> {
  const release = await fetchLatestRelease()

  const tgzAsset = release.assets.find((a) => a.name.endsWith('.tgz'))
  if (!tgzAsset) {
    throw new Error('No .tgz asset found in latest release')
  }

  const commitHash = extractCommitHash(tgzAsset.name)

  return [
    {
      id: 'release',
      title: 'Release',
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

async function fetchFirmware(url: string) {
  return await instance
    .get(url, { responseType: 'arraybuffer' })
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
    .get(url, { responseType: 'arraybuffer' })
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
