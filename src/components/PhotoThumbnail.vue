<script setup>
import TagChip from './TagChip.vue'

defineProps({
  photo: { type: Object, required: true },
})
const emit = defineEmits(['delete'])

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <v-card class="photo-thumbnail" variant="outlined">
    <v-img
      :src="photo.publicUrl"
      :aspect-ratio="4/3"
      cover
      class="rounded-t-lg"
    />
    <v-card-text class="pa-2 d-flex align-center">
      <span class="text-caption text-grey">
        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
        {{ formatTime(photo.captured_at) }}
      </span>
      <v-btn
        icon="mdi-delete-outline"
        size="x-small"
        variant="text"
        color="error"
        class="mx-2"
        @click.stop="emit('delete')"
      />
      <v-spacer />
      <TagChip :tag="photo.tag" />
    </v-card-text>
  </v-card>
</template>
