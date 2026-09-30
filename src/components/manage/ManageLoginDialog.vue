<script setup>
import { ref, watch } from 'vue'
import { useManageAuth } from '../../composables/useManageAuth'

const props = defineProps({ modelValue: Boolean })

const { loadSavedManageUsername, manageLogin } = useManageAuth()
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMsg = ref('')
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  if (val) {
    username.value = loadSavedManageUsername()
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
    const user = await manageLogin(name, password.value)
    if (!user) {
      errorMsg.value = 'ユーザー名またはパスワードが違います'
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
      <v-card-title class="text-h6">管理画面にログイン</v-card-title>
      <v-card-text>
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
