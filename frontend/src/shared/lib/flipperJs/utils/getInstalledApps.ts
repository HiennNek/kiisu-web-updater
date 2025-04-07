import Flipper from '../flipper'
import { FlipperModel } from 'entity/Flipper'

import { rpcErrorHandler } from 'shared/lib/utils/useRpcUtils'
import { readManifest } from './readManifest'

const componentName = 'FlipperJS Util GetInstalled'

let installedApps: FlipperModel.App[] = []

function onClearInstalledAppsList(this: Flipper) {
  installedApps = []
  this.applicationQuantity = 0
  this.numberOfApplicationManifests = 0
}

interface Args {
  callbackProgress?: (percent: number) => void
}

async function getInstalledApps(this: Flipper, args: Args) {
  let { callbackProgress } = args
  if (!callbackProgress) {
    callbackProgress = () => {}
  }

  if (this.flipperReady) {
    await this.RPC('systemPing', { timeout: 1000 }).catch((error: Error) => {
      throw error
    })

    const manifestsList = await this.RPC('storageList', {
      path: '/ext/apps_manifests'
    }).catch((error: Error) => {
      rpcErrorHandler({
        componentName,
        error,
        command: 'storageList /ext/apps_manifests'
      })

      throw error
    })

    if (manifestsList?.length) {
      this.applicationQuantity = manifestsList.length

      try {
        for await (const file of manifestsList) {
          await this.RPC('systemPing', { timeout: 1000 }).catch(
            (error: Error) => {
              throw error
            }
          )

          const app: FlipperModel.App | undefined = await readManifest
            .bind(this)(file)
            .catch((error: Error) => {
              throw error
            })

          if (app) {
            installedApps.push(app)
          }

          this.numberOfApplicationManifests++

          callbackProgress(
            Math.round(
              (this.numberOfApplicationManifests / this.applicationQuantity) *
                100
            )
          )
        }

        return installedApps
      } catch (error) {
        throw error
      }
    } else {
      throw new Error('The manifests list is empty')
    }
  }

  return []
}

export { onClearInstalledAppsList, getInstalledApps }
