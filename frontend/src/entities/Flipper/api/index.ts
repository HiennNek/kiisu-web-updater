import { instance } from 'boot/axios'
import { unpack, ungzip } from 'shared/lib/utils/operation'
// import { Channel } from '../model/types'

async function fetchChannels(/* target: string */) {
  return await instance
    .get('https://update.flipperzero.one/firmware/directory.json')
    .then(({ data }) => {
      const params = new URLSearchParams(location.search)
      const customSource = {
        url: params.get('url'),
        channel: params.get('channel'),
        version: params.get('version'),
        target: params.get('target')
      }

      if (customSource.url) {
        data.channels.push({
          id: 'custom',
          title: customSource.channel || 'Custom',
          versions: [
            {
              version: customSource.version || 'unknown',
              timestamp: Date.now(),
              files: [
                {
                  url: customSource.url,
                  type: 'update_tgz',
                  target: customSource.target || 'f7'
                }
              ]
            }
          ]
        })
      }

      return data.channels
    })
    .catch((err) => {
      const data = err.response.data

      console.error(err)

      return data
    })
}

async function fetchRegions() {
  return await instance
    .get('https://update.flipperzero.one/regions/api/v0/bundle')
    .then(({ data }) => {
      if (data.error) {
        throw new Error(data.error.text)
      } else if (data.success) {
        return data.success
      }
    })
    .catch(({ status }) => {
      if (status >= 400) {
        throw new Error('Failed to fetch region (' + status + ')')
      }
    })
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
  fetchRegions,
  fetchFirmware,
  fetchFirmwareTar
}
