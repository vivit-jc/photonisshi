<script setup>
import { ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'logged-in', 'go-register'])

const { loadSavedUsername, login } = useAuth()
const username = ref('')
const errorMsg = ref('')
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  if (val) {
    username.value = loadSavedUsername()
    errorMsg.value = ''
  }
})

async function handleLogin() {
  const name = username.value.trim()
  if (!name) {
    errorMsg.value = 'ユーザー名を入力してください'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const user = await login(name)
    if (user) {
      emit('logged-in')
    } else {
      errorMsg.value = 'ユーザーが見つかりません'
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
      <v-card-title class="text-h6">photonisshi にログイン</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="username"
          label="ユーザー名"
          prepend-inner-icon="mdi-account"
          autofocus
          :error-messages="errorMsg"
          @keyup.enter="handleLogin"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="emit('go-register')">
          新規登録
        </v-btn>
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
