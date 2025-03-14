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
import { useRouter } from 'vue-router'

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

const router = useRouter()

const onClick = () => {
  if (props.app) {
    appsStore
      .openApp(props.app.path)
      .then(() => {
        flipperStore.expandView = true

        router.push({ name: 'Device' })
      })
      .catch(() => {
        console.log('error')
      })
  }
}
</script>
