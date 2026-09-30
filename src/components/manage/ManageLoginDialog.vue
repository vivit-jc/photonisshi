<script setup>
import { ref, watch } from 'vue'

// 管理画面ログインとユーザー管理画面（admin）ログインで共用する
// login は (username, password) を受け取り、失敗時は null を返す async 関数
const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '管理画面にログイン' },
  description: { type: String, default: '' },
  initialUsername: { type: String, default: '' },
  failedMessage: { type: String, default: 'ユーザー名またはパスワードが違います' },
  login: { type: Function, required: true },
  cancelable: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel'])

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMsg = ref('')
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  if (val) {
    username.value = props.initialUsername
    password.value = ''
    errorMsg.value = ''
  }
}, { immediate: true })

async function handleLogin() {
  const name = username.value.trim()
  if (!name || !password.value) {
    errorMsg.value = 'ユーザー名とパスワードを入力してください'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const user = await props.login(name, password.value)
    if (!user) {
      errorMsg.value = props.failedMessage
      password.value = ''
    }
  } catch (e) {
    errorMsg.value = 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" persistent max-width="400">
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text>
        <div v-if="description" class="text-body-2 text-grey-darken-1 mb-4">{{ description }}</div>
        <v-text-field
          v-model="username"
          label="ユーザー名"
          prepend-inner-icon="mdi-account"
          autocomplete="username"
          :autofocus="!username"
          class="mb-2"
          @keyup.enter="handleLogin"
        />
        <v-text-field
          v-model="password"
          label="パスワード"
          prepend-inner-icon="mdi-lock"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          autocomplete="current-password"
          :autofocus="!!username"
          :error-messages="errorMsg"
          @click:append-inner="showPassword = !showPassword"
          @keyup.enter="handleLogin"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="cancelable" variant="text" @click="emit('cancel')">戻る</v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          @click="handleLogin"
        >
          ログイン
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
