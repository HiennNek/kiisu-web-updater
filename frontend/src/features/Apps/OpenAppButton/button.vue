<template>
  <q-btn
    class="text-pixelated fit text-body1"
    unelevated
    dense
    color="accent"
    label="Open"
    @click.stop="onClick"
    :loading="props.loading"
  />
</template>

<script setup lang="ts">
import { AppsModel } from 'entity/Apps'
const appsStore = AppsModel.useAppsStore()

import { FlipperModel } from 'entity/Flipper'
const flipperStore = FlipperModel.useFlipperStore()

interface Props {
  app: AppsModel.InstalledApp
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const onClick = () => {
  if (props.app) {
    appsStore
      .openApp(props.app.path)
      .then(() => {
        flipperStore.flipper!.frameData = undefined

        flipperStore.expandView = true
      })
      .catch(() => {
        console.log('error')
      })
  }
}
</script>
