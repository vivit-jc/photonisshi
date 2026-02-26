<script setup>
import { useLongPress } from '../composables/useLongPress'
import TagChip from './TagChip.vue'

const props = defineProps({
  photo: { type: Object, required: true },
})
const emit = defineEmits(['delete'])

const { handlers } = useLongPress(() => emit('delete'))

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <v-card v-bind="handlers" class="photo-thumbnail" variant="outlined">
    <v-img
      :src="photo.publicUrl"
      :aspect-ratio="4/3"
      cover
      class="rounded-t-lg"
    />
    <v-card-text class="pa-2 d-flex align-center justify-space-between">
      <span class="text-caption text-grey">
        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
        {{ formatTime(photo.captured_at) }}
      </span>
      <TagChip :tag="photo.tag" />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.photo-thumbnail {
  user-select: none;
  -webkit-user-select: none;
}
</style>
