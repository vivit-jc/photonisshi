<script setup>
defineProps({
  tag: { type: Object, default: null },
  type: { type: String, default: null }, // override: 'gps', 'manual', 'common'
})

function getColor(tag, typeOverride) {
  const t = typeOverride || tag?.type
  if (t === 'gps') return 'orange'
  if (t === 'common') return 'teal'
  return 'primary'
}

function getIcon(tag, typeOverride) {
  const t = typeOverride || tag?.type
  if (t === 'gps') return 'mdi-map-marker'
  if (t === 'common') return 'mdi-tag-heart'
  return 'mdi-tag'
}
</script>

<template>
  <v-chip v-if="tag" size="small" :color="getColor(tag, type)" variant="tonal">
    <v-icon start size="small">{{ getIcon(tag, type) }}</v-icon>
    {{ tag.name }}
  </v-chip>
</template>
