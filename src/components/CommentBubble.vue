<script setup>
defineProps({
  comment: { type: Object, required: true },
})
const emit = defineEmits(['delete'])

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <v-card variant="tonal" color="grey-lighten-4" class="comment-bubble">
    <v-card-text class="pa-3">
      <div class="text-body-2 text-black- comment-content">{{ comment.content }}</div>
      <div class="d-flex align-center mt-1">
        <span class="text-caption text-grey-darken-3">
          <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
          {{ formatTime(comment.commented_at) }}
        </span>
        <v-btn
          icon="mdi-delete-outline"
          size="x-small"
          variant="text"
          color="error"
          class="ml-1"
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
