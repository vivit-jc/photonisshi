<script setup>
import TagChip from './TagChip.vue'

defineProps({
  photo: { type: Object, required: true },
})
const emit = defineEmits(['delete', 'tag', 'edit'])

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
    <v-card-text v-if="photo.caption" class="pa-2 pb-0 text-body-2">
      {{ photo.caption }}
    </v-card-text>
    <v-card-text class="pa-2 d-flex align-center flex-wrap ga-1">
      <span class="text-caption text-grey">
        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
        {{ formatTime(photo.captured_at) }}
      </span>
      <v-btn
        icon="mdi-delete-outline"
        size="x-small"
        variant="text"
        color="error"
        @click.stop="emit('delete')"
      />
      <v-btn
        icon="mdi-tag-outline"
        size="x-small"
        variant="text"
        color="primary"
        @click.stop="emit('tag')"
      />
      <v-btn
        size="x-small"
        variant="text"
        color="grey-darken-1"
        prepend-icon="mdi-pencil-outline"
        @click.stop="emit('edit')"
      >
        日時を編集
      </v-btn>
      <v-spacer />
      <TagChip v-for="tag in (photo.tags || [])" :key="tag.id" :tag="tag" />
      <TagChip v-if="photo.gpsTag" :tag="photo.gpsTag" type="gps" />
    </v-card-text>
  </v-card>
</template>
