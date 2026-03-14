<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  previewUrls: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const caption = ref('')

watch(() => props.modelValue, (v) => {
  if (v) caption.value = ''
})

function handleSubmit() {
  emit('submit', caption.value.trim() || null)
  emit('update:modelValue', false)
}

function handleSkip() {
  emit('submit', null)
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <div v-if="previewUrls.length === 1">
        <v-img :src="previewUrls[0]" max-height="200" cover class="rounded-t" />
      </div>
      <div v-else-if="previewUrls.length > 1" class="d-flex ga-1 pa-2 overflow-x-auto">
        <v-img
          v-for="(url, i) in previewUrls"
          :key="i"
          :src="url"
          width="120"
          height="120"
          cover
          class="rounded flex-shrink-0"
        />
      </div>
      <v-card-title class="text-body-1 font-weight-bold">
        キャプションを入力
        <span v-if="previewUrls.length > 1" class="text-caption text-grey ml-2">
          {{ previewUrls.length }}枚
        </span>
      </v-card-title>
      <v-card-text>
        <v-textarea
          v-model="caption"
          label="キャプション（任意）"
          hide-details
          density="compact"
          rows="2"
          auto-grow
          max-rows="5"
          autofocus
        />
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="handleSkip">スキップ</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="handleSubmit">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
