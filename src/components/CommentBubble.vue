<script setup>
import { useLongPress } from '../composables/useLongPress'

const props = defineProps({
  comment: { type: Object, required: true },
})
const emit = defineEmits(['delete'])

const { handlers } = useLongPress(() => emit('delete'))

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <v-card v-bind="handlers" variant="tonal" color="grey-lighten-4" class="comment-bubble">
    <v-card-text class="pa-3">
      <div class="text-body-2">{{ comment.content }}</div>
      <div class="text-caption text-grey mt-1">
        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
        {{ formatTime(comment.commented_at) }}
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.comment-bubble {
  user-select: none;
  -webkit-user-select: none;
  border-radius: 12px !important;
  border-top-left-radius: 4px !important;
}
</style>
