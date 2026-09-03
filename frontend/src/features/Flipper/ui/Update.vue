<template>
  <div class="column flex-center text-center">
    <div class="flex justify-between items-center full-width q-mt-xs q-pb-md">
      <p class="q-mb-none text-bold text-body1">Firmware Update</p>
      <q-btn
        v-if="getChannel('release')?.versions[0]!.changelog?.trim().length"
        @click="
          () => {
            changelogDialog = true
          }
        "
        outline
        size="sm"
        padding="xs md"
        label="What's New"
        icon="mdi-information-outline"
        no-caps
      />
    </div>
    <div class="q-mb-md full-width">
      <p class="q-mb-xs text-caption text-grey text-center">
        Select your firmware fork
      </p>
      <q-btn-group
        spread
        outline
        class="full-width rounded-borders overflow-hidden"
        :disable="flipperStore.flags.updateInProgress"
      >
        <q-btn
          v-for="origin in [
            { label: 'Unleashed (Kiisu-UNLSHD)', value: 'unleashed' },
            { label: 'Momentum (Kiisu-MNTM)', value: 'momentum' }
          ]"
          :key="origin.value"
          :label="origin.label"
          no-caps
          :color="firmwareOrigin === origin.value ? 'positive' : 'grey-3'"
          :text-color="firmwareOrigin === origin.value ? 'white' : 'grey-8'"
          class="col"
          @click="setFirmwareOrigin(origin.value as FirmwareOriginId)"
        />
      </q-btn-group>
    </div>
    <template v-if="ableToUpdate && flipperStore.info?.storage.sdcard?.status">
      <template v-if="outdated !== undefined">
        <p class="q-mb-sm">
          <span v-if="outdated">
            Your firmware is out of date, newest release is
            {{ getChannel('release')?.versions[0]!.version }}.
          </span>
          <span v-else-if="flipperStore.info.firmware.version !== 'unknown'">
            Your firmware is up to date.
          </span>
        </p>
      </template>
      <div class="column full-width">
        <div class="flex no-wrap justify-between items-center">
          <p class="q-mb-none">Firmware</p>
          <p class="q-mb-none text-positive">
            Release {{ getChannel('release')?.versions[0]!.version || '...' }}
          </p>
        </div>
        <div class="flex center">
          <template v-if="!flipperStore.flags.updateInProgress">
            <q-btn
              @click="update()"
              class="full-width q-mt-sm text-pixelated text-h5"
              unelevated
              color="positive"
              padding="12px 30px"
              >{{ getTextButton }}</q-btn
            >
          </template>
          <template v-else>
            <div class="column flex-center text-center full-width">
              <p>{{ updateStage }}</p>
              <q-btn
                v-if="updateError"
                outline
                class="q-mt-md"
                @click="cancelUpdate()"
                >Cancel</q-btn
              >
              <ProgressBar
                v-else-if="write.filename.length > 0"
                class="full-width"
                :title="write.filename"
                :progress="write.progress"
                color="positive"
                trackColor="green-4"
                size="56px"
                interpolated
              />
            </div>
          </template>
        </div>
      </div>
      <q-btn
        v-if="installFromFile"
        @click="
          () => {
            uploadPopup = true
            uploadedFile = undefined
          }
        "
        :disable="flipperStore.flags.updateInProgress"
        class="q-mt-lg"
        outline
        color="grey-8"
      >
        Install from file
      </q-btn>
    </template>
    <template v-else>
      <div class="flex center">
        <span v-if="flipperStore.info?.storage.sdcard?.status"
          >Your firmware doesn't support self-update. Install latest release
          using <b>repair mode</b>.</span
        >
        <span v-else>Self-update is impossible without an SD card.</span>
      </div>
    </template>

    <q-dialog v-model="uploadPopup">
      <q-card>
        <q-card-section class="q-pt-none">
          <q-file
            outlined
            v-model="uploadedFile"
            label="Drop or select files"
            accept=".tgz"
            class="q-pt-md"
            :style="$q.screen.width > 380 ? 'width: 300px;' : ''"
          >
            <template v-slot:prepend>
              <q-icon name="file_upload"></q-icon>
            </template>
          </q-file>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Upload"
            v-close-popup
            @click="update(true)"
          ></q-btn>
          <q-btn flat label="Cancel" color="negative" v-close-popup></q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="changelogDialog">
      <q-layout view="HHH lpr FFF" container class="bg-white">
        <q-header class="column flex-center q-py-sm bg-white text-black" reveal>
          <p class="q-mb-none text-h5 text-bold">What's New</p>
          <p class="q-mb-none text-positive">
            Release {{ getChannel('release')?.versions[0]!.version || '...' }}
          </p>
        </q-header>
        <q-page-container>
          <q-page padding>
            <q-markdown
              no-heading-anchor-links
              no-html
              no-linkify
              no-typographer
              :src="getChannel('release')?.versions[0]!.changelog || ''"
            />
          </q-page>
        </q-page-container>
        <q-footer class="bg-transparent">
          <q-btn
            class="full-width q-mt-sm text-pixelated text-h5"
            v-close-popup
            @click="update()"
            :disable="flipperStore.flags.updateInProgress"
            color="positive"
            padding="12px 30px"
            unelevated
            >{{ getTextButton }}</q-btn
          >
        </q-footer>
      </q-layout>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import asyncSleep from 'simple-async-sleep'

import { unpack } from 'shared/lib/utils/operation'

import { showNotif } from 'shared/lib/utils/useShowNotif'
import { logger } from 'shared/lib/utils/useLog'
import { rpcErrorHandler } from 'shared/lib/utils/useRpcUtils'

import { ProgressBar } from 'shared/components/ProgressBar'
import { FlipperModel, FlipperApi } from 'entity/Flipper'
import {
  type FirmwareOriginId
} from 'entity/Flipper/api/index'
const flipperStore = FlipperModel.useFlipperStore()
const { fetchChannels, fetchFirmware } = FlipperApi

const componentName = 'KiisuUpdate'

const FIRMWARE_ORIGIN_KEY = 'kiisu-firmware-origin'
const firmwareOrigin = ref<FirmwareOriginId>(
  (localStorage.getItem(FIRMWARE_ORIGIN_KEY) as FirmwareOriginId) || 'unleashed'
)
const setFirmwareOrigin = (origin: FirmwareOriginId) => {
  firmwareOrigin.value = origin
  localStorage.setItem(FIRMWARE_ORIGIN_KEY, origin)
  loadRelease()
}

const outdated = ref<boolean | undefined>(false)
const ableToUpdate = ref(true)

const installFromFile = ref(true)
const uploadedFile = ref<File>()
const uploadPopup = ref(false)
const changelogDialog = ref(false)

const updateError = ref(false)

const channels = ref<FlipperModel.Channel[]>([])
const getChannel = (channelId: string) => {
  if (channels.value.length) {
    return channels.value.find((channel) => channel.id === channelId)
  }

  return undefined
}
const releaseVersion = ref('')

const emit = defineEmits<{ (event: 'updateInProgress'): Promise<void> }>()

const loadRelease = async () => {
  channels.value = await fetchChannels(firmwareOrigin.value).catch((error) => {
    showNotif({
      message: 'Unable to load firmware from GitHub releases.',
      color: 'negative',
      actions: [
        {
          label: 'Reload',
          color: 'white',
          handler: () => {
            location.reload()
          }
        }
      ]
    })
    logger.error({
      context: componentName,
      message: 'failed to fetch firmware release'
    })
    throw error
  })

  if (channels.value.length) {
    releaseVersion.value =
      getChannel('release')?.versions[0]!.version || ''
  }

  compareVersions()
}

onMounted(loadRelease)

const compareVersions = () => {
  if (flipperStore.info?.firmware.commit?.hash) {
    const deviceHash = flipperStore.info.firmware.commit.hash
    if (releaseVersion.value) {
      outdated.value = deviceHash !== releaseVersion.value
    } else {
      outdated.value = true
    }
  } else {
    outdated.value = undefined
  }
}

const getTextButton = computed(() => {
  if (outdated.value === false) {
    return 'Reinstall'
  }

  if (outdated.value) {
    return 'Update'
  }

  return 'Install'
})

const update = async (fromFile = false) => {
  updateStage.value = ''

  if (!flipperStore.info?.storage.sdcard?.status.isInstalled) {
    flipperStore.dialogs.microSDcardMissing = true
    return
  }

  flipperStore.onUpdateStage('start')

  if (fromFile) {
    if (!uploadedFile.value) {
      updateError.value = true
      flipperStore.onUpdateStage('end')
      updateStage.value = 'No file selected'
      throw new Error(updateStage.value)
    } else if (!uploadedFile.value.name.endsWith('.tgz')) {
      updateError.value = true
      flipperStore.onUpdateStage('end')
      updateStage.value = 'Wrong file format'
      throw new Error(updateStage.value)
    }
    logger.info({
      context: componentName,
      message: 'Uploading firmware from file'
    })
  }

  await emit('updateInProgress')
  await loadFirmware().catch((error: Error) => {
    updateError.value = true
    updateStage.value = error.message || error.toString()

    flipperStore.onUpdateStage('end')

    throw error
  })
}

const updateStage = ref('')
const write = ref({
  filename: '',
  progress: 0
})
const loadFirmware = async () => {
  updateStage.value = 'Loading firmware bundle...'

  const channel = getChannel('release')

  if (uploadedFile.value || channel) {
    let files
    if (uploadedFile.value) {
      const buffer = await uploadedFile.value.arrayBuffer()
      files = await unpack(buffer).then((value: object) => {
        logger.debug({
          context: componentName,
          message: 'Unpacked firmware'
        })
        return value
      })
    } else {
      const file = channel?.versions[0]!.files.find(
        (_file) => _file.type === 'update_tgz'
      )

      if (file) {
        files = await fetchFirmware(file.url)
          .then((value) => {
            logger.debug({
              context: componentName,
              message: `Downloaded firmware from ${file.url}`
            })
            return value
          })
          .catch((error: Error) => {
            updateError.value = true
            updateStage.value = error.toString()
            showNotif({
              message: 'Failed to fetch firmware: ' + error.toString(),
              color: 'negative',
              actions: [
                {
                  label: 'Reload',
                  color: 'white',
                  handler: () => {
                    location.reload()
                  }
                }
              ]
            })

            const message = `${componentName}: Failed to fetch firmware: ${error.toString()}`
            logger.error({
              context: componentName,
              message
            })
            throw new Error(message)
          })
      }
    }

    updateStage.value = 'Loading firmware files'

    if (updateError.value) {
      return
    }

    let path = '/ext/update/'
    const updateDir = await flipperStore.flipper
      ?.RPC('storageStat', { path: '/ext/update' })
      .catch(async (error: Error) => {
        if (error.toString() !== 'ERROR_STORAGE_NOT_EXIST') {
          const command = 'storageStat'
          rpcErrorHandler({
            componentName,
            error,
            command
          })

          throw new Error(
            `${componentName}: RPC error in command '${command}': ${error.toString()}`
          )
        } else {
          logger.debug({
            context: componentName,
            message: 'Storage /ext/update not exist'
          })
        }
      })

    if (!updateDir) {
      await flipperStore.flipper
        ?.RPC('storageMkdir', { path: '/ext/update' })
        .then(() =>
          logger.debug({
            context: componentName,
            message: 'storageMkdir: /ext/update'
          })
        )
        .catch((error: Error) => {
          const command = 'storageMkdir'
          rpcErrorHandler({ componentName, error, command })

          throw new Error(
            `${componentName}: RPC error in command '${command}': ${error.toString()}`
          )
        })
    }

    for (const file of files) {
      if (updateError.value) {
        return
      }
      if (file.size === 0) {
        path = '/ext/update/' + file.name
        if (file.name.endsWith('/')) {
          path = path.slice(0, -1)
        }

        const updateVersionDir = await flipperStore.flipper
          ?.RPC('storageStat', { path })
          .catch(async (error: Error) => {
            if (error.toString() !== 'ERROR_STORAGE_NOT_EXIST') {
              const command = 'storageStat'
              rpcErrorHandler({
                componentName,
                error,
                command
              })

              throw new Error(
                `${componentName}: RPC error in command '${command}': ${error.toString()}`
              )
            } else {
              logger.debug({
                context: componentName,
                message: 'Storage /ext/update not exist'
              })
            }
          })

        if (!updateVersionDir) {
          await flipperStore.flipper
            ?.RPC('storageMkdir', { path })
            .then(() =>
              logger.debug({
                context: componentName,
                message: `storageMkdir: ${path}`
              })
            )
            .catch((error: Error) => {
              const command = 'storageMkdir'
              rpcErrorHandler({ componentName, error, command })

              throw new Error(
                `${componentName}: RPC error in command '${command}': ${error.toString()}`
              )
            })
        }
      } else {
        write.value.filename = file.name.slice(file.name.lastIndexOf('/') + 1)
        const unbind = flipperStore.flipper?.emitter.on(
          'storageWriteRequest/progress',
          (e: { progress: number; total: number }) => {
            if (!flipperStore.flipper?.connected) {
              throw new Error(
                `Kiisu ${flipperStore.flipper?.name} not connected`
              )
            }

            write.value.progress = e.progress / e.total
          }
        )
        await flipperStore.flipper
          ?.RPC('storageWrite', {
            path: '/ext/update/' + file.name,
            buffer: file.buffer
          })
          .then(() =>
            logger.debug({
              context: componentName,
              message: `storageWrite: /ext/update/${file.name}`
            })
          )
          .catch((error: Error) => {
            const command = 'storageWrite'
            rpcErrorHandler({ componentName, error, command })

            throw new Error(
              `${componentName}: RPC error in command '${command}': ${error.toString()}`
            )
          })

        if (unbind) {
          unbind()
        }
      }
      await asyncSleep(300)
    }

    write.value.filename = ''
    write.value.progress = 0

    updateStage.value = 'Loading manifest...'

    if (updateError.value) {
      return
    }

    await flipperStore.flipper
      ?.RPC('systemUpdate', { path: path + '/update.fuf' })
      .then(() =>
        logger.debug({
          context: componentName,
          message: 'systemUpdate: OK'
        })
      )
      .catch((error: Error) => {
        const command = 'systemUpdate'
        rpcErrorHandler({ componentName, error, command })

        throw new Error(
          `${componentName}: RPC error in command '${command}': ${error.toString()}`
        )
      })

    updateStage.value = 'Update in progress, pay attention to your Kiisu'

    await flipperStore.flipper
      ?.RPC('systemReboot', { mode: 'UPDATE' })
      .catch((error: Error) => {
        const command = 'systemReboot'
        rpcErrorHandler({ componentName, error, command })

        throw new Error(
          `${componentName}: RPC error in command '${command}': ${error.toString()}`
        )
      })

    flipperStore.flags.waitForReconnect = true
    flipperStore.flags.autoReconnect = true
  } else {
    updateError.value = true

    updateStage.value = 'Failed to fetch channel'

    showNotif({
      message: 'Unable to load firmware channel from the build server.',
      color: 'negative',
      actions: [
        {
          label: 'Reload',
          color: 'white',
          handler: () => {
            location.reload()
          }
        }
      ]
    })
    throw new Error(updateStage.value)
  }
}

const cancelUpdate = () => {
  flipperStore.flags.waitForReconnect = false
  flipperStore.flags.updateInProgress = false
  updateError.value = false
  updateStage.value = ''
  // reload()
}
</script>
