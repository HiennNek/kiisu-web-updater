<template>
  <q-drawer
    class="menu-link bg-grey-2"
    show-if-above
    :width="175"
    :breakpoint="900"
  >
    <q-scroll-area class="fit">
      <q-tab-panels v-model="tab" class="fit bg-transparent" animated>
        <q-tab-panel class="no-padding" name="home">
          <q-list class="column fit justify-between no-wrap">
            <div>
              <RouterLink
                v-for="link in linksList"
                :key="link.title"
                :disable="flipperStore.flags.disableNavigation"
                v-bind="link"
              />
            </div>
            <q-space />
            <q-item clickable @click="showSettingsMenu">
              <q-item-section avatar>
                <q-icon name="flipper:settings" size="24px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Settings</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator class="menu-link__separator" />
            <template v-if="!flipperStore.isElectron">
              <FlipperConnectWebBtn type="item" />
            </template>
            <template v-else>
              <FlipperSwitch />
            </template>
          </q-list>
        </q-tab-panel>
        <q-tab-panel class="no-padding" name="settings">
          <q-list class="column fit justify-between no-wrap">
            <q-space />
            <q-item>
              <q-toggle
                v-if="!flipperStore.isElectron"
                v-model="flipperStore.flags.autoReconnect"
                dense
                label="Auto reconnect"
                :disable="flipperStore.flags.disableNavigation"
                @click="toggleAutoReconnect"
              />
            </q-item>


            <q-item
              v-if="flipperStore.isElectron"
              clickable
              @click="showDownloadPathDialog"
            >
              <q-item-section avatar style="min-width: initial">
                <q-icon name="mdi-folder-arrow-down-outline" />
              </q-item-section>

              <q-item-section>
                <q-item-label
                  >{{ selectedDownloadPath ? 'Update ' : 'Select ' }}download
                  path</q-item-label
                >
              </q-item-section>
            </q-item>

            <q-item clickable @click="showLogsDialog">
              <q-item-section avatar style="min-width: initial">
                <q-icon name="flipper:logs" />
              </q-item-section>

              <q-item-section>
                <q-item-label>View logs</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable @click="showHomeMenu">
              <q-item-section avatar>
                <q-icon size="2rem" name="mdi-chevron-left" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Back</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-scroll-area>
  </q-drawer>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'shared/components/RouterLink'
import { FlipperConnectWebBtn } from 'features/Flipper'
import { FlipperSwitch } from 'features/Flipper'

import { FlipperModel } from 'entity/Flipper'
const flipperStore = FlipperModel.useFlipperStore()

const tab = ref('home')

const showSettingsMenu = () => {
  tab.value = 'settings'
}

const showHomeMenu = () => {
  tab.value = 'home'
}

const linksList = [
  {
    title: 'My Kiisu',
    icon: 'flipper:device',
    name: 'Device',
    titleOverride: computed(() => flipperStore.flipperName || 'My Kiisu')
  },
  {
    title: 'Files',
    icon: 'flipper:files',
    name: 'Archive'
  },
  {
    title: 'CLI',
    icon: 'flipper:cli',
    name: 'Cli'
  }
]

const toggleAutoReconnect = () => {
  localStorage.setItem(
    'autoReconnect',
    String(flipperStore.flags.autoReconnect)
  )

  if (!flipperStore.flags.autoReconnect) {
    clearInterval(flipperStore.reconnectInterval)
  } else {
    if (!flipperStore.flipper?.connected) {
      flipperStore.onAutoReconnect()
    }
  }
}

const showLogsDialog = () => {
  flipperStore.dialogs.logs = true
}

const showDownloadPathDialog = () => {
  flipperStore.dialogs.downloadPath = true
}

const selectedDownloadPath = ref('')

onMounted(() => {
  if (flipperStore.isElectron) {
    const downloadPath = localStorage.getItem('flipperFileExplorerDownloadPath')
    if (downloadPath) {
      selectedDownloadPath.value = downloadPath
    }
  }
})
</script>

<style lang="scss" scoped>
:deep(.menu-link .q-scrollarea__content) {
  height: 100%;
}

.menu-link {
  &__separator {
    width: 85%;
    margin: auto;
  }
}

// Navigation buttons: normal and q-focus-helper to Kiisu green #0fff6b
:deep(.menu-link .q-item) {
  color: #0fff6b;
}

:deep(.menu-link .q-item .q-focus-helper) {
  background: #0fff6b !important;
  opacity: 0.2 !important;
}

:deep(.menu-link .q-item.q-router-link--active),
:deep(.menu-link .q-item--active) {
  color: #0fff6b !important;
  background: rgba(15, 255, 107, 0.12) !important;
}
</style>
