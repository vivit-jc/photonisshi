<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  previewUrl: { type: String, default: null },
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
      <v-img v-if="previewUrl" :src="previewUrl" max-height="200" cover class="rounded-t" />
      <v-card-title class="text-body-1 font-weight-bold">キャプションを入力</v-card-title>
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
