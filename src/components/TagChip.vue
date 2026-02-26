<script setup>
defineProps({
  tag: { type: Object, default: null },
})
</script>

<template>
  <v-chip v-if="tag" size="small" color="primary" variant="tonal">
    <v-icon start size="small">mdi-tag</v-icon>
    {{ tag.name }}
  </v-chip>
  <v-chip v-else size="small" variant="outlined" color="grey">
    タグなし
  </v-chip>
</template>
