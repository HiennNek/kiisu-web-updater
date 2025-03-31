<template>
  <q-card
    class="installed-card row no-wrap items-center"
    :class="{
      'cursor-pointer installed-card--supported':
        !unsupported && globalStore.isOnline
    }"
    flat
    :tabindex="unsupported && !globalStore.isOnline ? -1 : 0"
    @click="onClick"
  >
    <q-card-section class="row col items-center">
      <div class="installed-card__icon-wrapper q-mr-md">
        <q-img
          :src="`data:image/png;base64,${app.icon}`"
          style="image-rendering: pixelated"
        />
      </div>
      <div class="col column q-mr-md">
        <div class="row">
          <p class="text-h6 q-mr-sm q-mb-none">{{ app.name }}</p>
          <q-chip
            v-if="unsupported"
            class="q-px-sm"
            color="deep-orange-2"
            icon="mdi-alert-circle-outline"
            label="Outdated app"
            size="12px"
            dense
          />
        </div>
        <div class="text-grey-7">
          {{ app.installedVersion.shortDescription }}
        </div>
      </div>
      <q-space />
      <div v-if="app.installedVersion.version" class="column items-end">
        <p class="text-grey-7 q-mb-none">Version:</p>
        <b>{{ app.installedVersion.version }}</b>
      </div>
    </q-card-section>
    <q-card-section class="row no-wrap">
      <template v-if="app.action?.type || getAppAction(app)">
        <ProgressBar
          style="width: 120px"
          :title="app.action.progress * 100 + '%'"
          :progress="app.action.progress"
          :color="appsStore.progressColors(app.action.type).bar"
          :trackColor="appsStore.progressColors(app.action.type).track"
          interpolated
        />
      </template>
      <template v-else>
        <div class="installed-card__button-wrapper q-mr-sm">
          <slot name="button" />
        </div>
        <div class="col-auto">
          <AppDeleteBtn :app="app" />
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { AppDeleteBtn } from 'features/Apps/DeleteButton'
import { ProgressBar } from 'shared/components/ProgressBar'
import { AppsModel } from 'entity/Apps'
const appsStore = AppsModel.useAppsStore()

import { useGlobalStore } from 'shared/stores/global-store'
const globalStore = useGlobalStore()

interface Props {
  app: AppsModel.InstalledApp
  unsupported?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  unsupported: false
})

interface Emits {
  click: [alias: Props['app']['alias']]
}
const emit = defineEmits<Emits>()

const getAppAction = (app: AppsModel.InstalledApp) => {
  const actionApp = appsStore.actionAppList.find((_app) => {
    if (_app.id === app.id) {
      return true
    }

    return false
  })

  if (actionApp) {
    app.action = actionApp.action

    return true
  }

  return false
}

const onClick = () => {
  if (globalStore.isOnline) {
    emit('click', props.app.alias)
  }
}
</script>

<style scoped lang="scss">
@import 'styles';
</style>
