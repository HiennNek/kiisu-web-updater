<template>
  <q-dialog>
    <q-card class="dialog">
      <q-btn
        icon="close"
        flat
        round
        dense
        v-close-popup
        class="dialog-close-btn"
      />

      <q-card-section class="q-pa-none q-ma-md" align="center">
        <div class="text-h6 q-my-sm">
          {{ selectedDownloadPath ? 'Update ' : 'Select ' }}download path
        </div>
        <p v-if="selectedDownloadPath">
          Now saving to
          <code class="text-caption">{{ selectedDownloadPath }}</code>
        </p>
      </q-card-section>
      <q-card-section class="q-pt-none" align="center">
        <q-btn
          outline
          color="primary"
          label="Select directory"
          @click="selectDownloadPath"
        ></q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FlipperModel } from 'entity/Flipper'
import { showNotif } from 'shared/lib/utils/useShowNotif'

const flipperStore = FlipperModel.useFlipperStore()
const selectedDownloadPath = ref('')

const selectDownloadPath = async () => {
  const res = await window.fs.updateDownloadPath()
  console.log(res)
  if (res?.status === 'error') {
    showNotif({
      message: res.message,
      color: 'negative'
    })
  }

  if (res?.status === 'ok') {
    showNotif({
      message: `Download path set to ${res.path}`,
      color: 'positive',
      timeout: 5000
    })

    localStorage.setItem('flipperFileExplorerDownloadPath', res.path!)
    selectedDownloadPath.value = res.path!
  }
}

const getDownloadPath = () => {
  const downloadPath = localStorage.getItem('flipperFileExplorerDownloadPath')
  if (downloadPath) {
    selectedDownloadPath.value = downloadPath
  }
}

onMounted(() => {
  if (flipperStore.isElectron) {
    getDownloadPath()
  }
})
</script>
