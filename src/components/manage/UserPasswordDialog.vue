<script setup>
import { ref, watch } from 'vue'
import { MIN_PASSWORD_LENGTH, userErrorMessage } from '../../composables/useManageUsers'

// submit は新しいパスワードを受け取る async 関数（失敗時はダイアログを閉じずにエラー表示）
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
  submit: { type: Function, required: true },
})
const emit = defineEmits(['update:modelValue'])

const password = ref('')
const passwordConfirm = ref('')
const errorMsg = ref('')
const loading = ref(false)

watch(() => props.modelValue, (v) => {
  if (!v) return
  password.value = ''
  passwordConfirm.value = ''
  errorMsg.value = ''
})

async function handleSubmit() {
  if (password.value.length < MIN_PASSWORD_LENGTH) {
    errorMsg.value = `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください`
    return
  }
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'パスワードが一致しません'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await props.submit(password.value)
    emit('update:modelValue', false)
  } catch (e) {
    errorMsg.value = userErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-body-1 font-weight-bold">
        {{ user?.has_password ? 'パスワードを変更' : 'パスワードを設定' }}
      </v-card-title>
      <v-card-text>
        <div class="text-body-2 mb-3">{{ user?.username }}</div>
        <v-text-field
          v-model="password"
          label="新しいパスワード"
          type="password"
          density="compact"
          autocomplete="new-password"
          hide-details
          class="mb-3"
        />
        <v-text-field
          v-model="passwordConfirm"
          label="新しいパスワード（確認）"
          type="password"
          density="compact"
          autocomplete="new-password"
          hide-details
          @keyup.enter="handleSubmit"
        />
        <div v-if="errorMsg" class="text-caption text-error mt-2">{{ errorMsg }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">キャンセル</v-btn>
        <v-btn color="primary" variant="flat" :loading="loading" @click="handleSubmit">設定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
