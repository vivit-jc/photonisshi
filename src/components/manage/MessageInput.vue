<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])

const text = ref('')
const stamps = ['👍', '❤️', '😊', '🎉', '💪', '🌟']

function sendText() {
  const content = text.value.trim()
  if (!content) return
  emit('send', { content, type: 'text' })
  text.value = ''
}

function sendStamp(stamp) {
  emit('send', { content: stamp, type: 'stamp' })
}
</script>

<template>
  <div>
    <div class="d-flex ga-2 align-end mb-2">
      <v-textarea
        v-model="text"
        label="メッセージを入力"
        hide-details
        density="compact"
        rows="1"
        auto-grow
        max-rows="3"
        @keyup.enter.exact="sendText"
      />
      <v-btn
        icon="mdi-send"
        color="teal"
        variant="tonal"
        size="small"
        :disabled="!text.trim()"
        @click="sendText"
      />
    </div>
    <div class="d-flex ga-1 flex-wrap">
      <v-btn
        v-for="stamp in stamps"
        :key="stamp"
        variant="text"
        size="small"
        min-width="36"
        class="text-h6 pa-0"
        @click="sendStamp(stamp)"
      >
        {{ stamp }}
      </v-btn>
    </div>
  </div>
</template>
