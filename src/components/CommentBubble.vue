<script setup>
import TagChip from './TagChip.vue'

defineProps({
  comment: { type: Object, required: true },
  showTagButton: { type: Boolean, default: true },
})
const emit = defineEmits(['delete', 'edit', 'tag'])

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <v-card variant="tonal" color="grey" class="comment-bubble">
    <v-card-text class="pa-3">
      <div class="text-body-2 text-grey-darken-3 comment-content">{{ comment.content }}</div>
      <div v-if="comment.tags && comment.tags.length > 0" class="d-flex flex-wrap ga-1 mt-1">
        <TagChip v-for="tag in comment.tags" :key="tag.id" :tag="tag" />
      </div>
      <div class="d-flex align-center mt-1">
        <span class="text-caption text-grey">
          <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
          {{ formatTime(comment.commented_at) }}
        </span>
        <v-btn
          icon="mdi-pencil-outline"
          size="x-small"
          variant="text"
          color="grey-darken-1"
          class="ml-1"
          @click.stop="emit('edit')"
        />
        <v-btn
          v-if="showTagButton"
          icon="mdi-tag-outline"
          size="x-small"
          variant="text"
          color="primary"
          @click.stop="emit('tag')"
        />
        <v-btn
          icon="mdi-delete-outline"
          size="x-small"
          variant="text"
          color="error"
          @click.stop="emit('delete')"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.comment-bubble {
  border-radius: 12px !important;
  border-top-left-radius: 4px !important;
}
.comment-content {
  white-space: pre-wrap;
}
</style>
