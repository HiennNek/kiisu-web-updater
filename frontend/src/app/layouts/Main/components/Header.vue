<template>
  <q-header>
    <q-toolbar>
      <q-btn
        v-show="$q.screen.xs"
        flat
        dense
        round
        icon="menu"
        aria-label="Menu"
        @click="emit('toggleLeftDrawer')"
      />

      <img
        v-show="!$q.screen.xs"
        src="~assets/flipper_lab_logo_monochrome.svg"
        class="q-ml-xs"
        style="height: 36px"
      />

      <q-space />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
const emit = defineEmits(['toggleLeftDrawer'])
</script>
