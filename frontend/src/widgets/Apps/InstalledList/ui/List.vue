<template>
  <div>
    <template
      v-if="globalStore.isOnline && !appsStore.flags.catalogIsUnknownSDK"
    >
      <div
        v-if="appsStore.updatableApps.length"
        style="width: 140px"
        class="q-mb-md q-pl-md"
      >
        <template v-if="appsStore.batch.inProcess">
          <ProgressBar
            :title="`${appsStore.batch.doneCount} / ${appsStore.batch.totalCount}`"
            :progress="
              appsStore.batch.doneCount / appsStore.batch.totalCount +
              appsStore.batch.progress / appsStore.batch.totalCount
            "
            color="positive"
            trackColor="green-4"
            size="33px"
          />
        </template>
        <template v-else>
          <q-btn
            class="fit text-pixelated text-body1"
            unelevated
            dense
            color="positive"
            label="Update all"
            @click="appsStore.batchUpdate(appsStore.updatableApps)"
          >
            <q-badge
              class="update-all-badge"
              :label="appsStore.appsUpdateCount"
            />
          </q-btn>
        </template>
      </div>
      <q-intersection
        v-for="updatableApp in appsStore.updatableApps"
        :key="updatableApp.id"
        once
        transition="scale"
      >
        <AppInstalledCard :app="updatableApp" @click="goAppPage">
          <template v-slot:button>
            <AppUpdateBtn :app="updatableApp" />
          </template>
        </AppInstalledCard>
      </q-intersection>

      <q-separator
        v-if="appsStore.updatableApps.length && appsStore.upToDateApps.length"
        class="q-my-lg"
      />

      <q-intersection
        v-for="upToDateApp in appsStore.upToDateApps"
        :key="upToDateApp.id"
        once
        transition="scale"
      >
        <AppInstalledCard :app="upToDateApp" @click="goAppPage">
          <template v-slot:button>
            <AppOpenAppBtn :app="upToDateApp" />
          </template>
        </AppInstalledCard>
      </q-intersection>

      <q-intersection
        v-for="unsupportedApp in appsStore.unsupportedApps"
        :key="unsupportedApp.id"
        once
        transition="scale"
      >
        <AppInstalledCard :app="unsupportedApp" unsupported>
          <template v-slot:button>
            <AppInstalledBtn />
          </template>
        </AppInstalledCard>
      </q-intersection>
    </template>
    <template v-else>
      <q-intersection
        v-for="installedApps in appsStore.installedApps"
        :key="installedApps.id"
        once
        transition="scale"
      >
        <AppInstalledCard :app="installedApps" @click="goAppPage">
          <template v-slot:button>
            <AppInstalledBtn />
          </template>
        </AppInstalledCard>
      </q-intersection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

import { ProgressBar } from 'shared/components/ProgressBar'
import { AppUpdateBtn } from 'features/Apps/UpdateButton'
import { AppOpenAppBtn } from 'features/Apps/OpenAppButton'
import { AppInstalledCard } from 'features/Apps/InstalledCard'
import { AppInstalledBtn, AppsModel } from 'entity/Apps'
const appsStore = AppsModel.useAppsStore()

import { FlipperModel } from 'entity/Flipper'
const flipperStore = FlipperModel.useFlipperStore()

import { CategoryModel } from 'entity/Category'
const categoriesStore = CategoryModel.useCategoriesStore()

import { useGlobalStore } from 'shared/stores/global-store'
const globalStore = useGlobalStore()

const getCategories = async () => {
  if (!globalStore.isOnline) {
    return
  }

  if (
    !categoriesStore.categoriesLoading &&
    (!categoriesStore.categories.length ||
      flipperStore.api !== categoriesStore.lastApi ||
      flipperStore.target !== categoriesStore.lastTarget)
  ) {
    await categoriesStore.getCategories({
      api: flipperStore.api,
      target: flipperStore.target
    })
  }
}

const goAppPage = (appAlias: AppsModel.App['alias']) => {
  router.push({ name: 'AppsPath', params: { path: appAlias } })
}

const reLoad = async () => {
  appsStore.onClearInstalledAppsList()

  await getCategories()

  if (flipperStore.flipper) {
    await appsStore.getInstalledApps({
      refreshInstalledApps: true
    })
  }
}

onMounted(async () => {
  await getCategories()

  if (
    !appsStore.loadingInstalledApps &&
    !appsStore.flipperInstalledApps?.length
  ) {
    await appsStore.getInstalledApps({
      refreshInstalledApps: true
    })
  }
})

// watch(
//   () => flipperStore.flipperReady,
//   async () => {
//     await reLoad()
//   }
// )

watch(
  () => appsStore.flags.catalogChannelProduction,
  async () => {
    await reLoad()
  }
)

watch(
  () => globalStore.isOnline,
  async (newValue) => {
    if (newValue) {
      await getCategories()
    }

    if (flipperStore.flipper) {
      await appsStore.getInstalledApps()
    }
  }
)
</script>

<style lang="scss" scoped>
@import 'styles';
</style>
