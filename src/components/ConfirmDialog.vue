<script setup>
defineProps({
  modelValue: Boolean,
  title: { type: String, default: '確認' },
  message: { type: String, default: '本当に削除しますか？' },
  confirmText: { type: String, default: '削除' },
  confirmColor: { type: String, default: 'error' },
})
const emit = defineEmits(['update:modelValue', 'confirm'])

function close() {
  emit('update:modelValue', false)
}
function confirm() {
  emit('confirm')
  close()
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="close">
    <v-card>
      <v-card-title class="text-body-1 font-weight-bold">{{ title }}</v-card-title>
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">キャンセル</v-btn>
        <v-btn :color="confirmColor" variant="flat" @click="confirm">{{ confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
