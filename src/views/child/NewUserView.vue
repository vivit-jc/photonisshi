<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { register } = useAuth()
const username = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleRegister() {
  const name = username.value.trim()
  if (!name) {
    errorMsg.value = 'ユーザー名を入力してください'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await register(name)
    router.push('/device')
  } catch (e) {
    errorMsg.value = e.message || '登録に失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="d-flex justify-center align-center" style="min-height: 60vh">
    <v-card max-width="400" width="100%">
      <v-card-title class="text-h6">新規ユーザー登録</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="username"
          label="ユーザー名"
          prepend-inner-icon="mdi-account-plus"
          autofocus
          :error-messages="errorMsg"
          @keyup.enter="handleRegister"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="router.go(0)">戻る</v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          @click="handleRegister"
        >
          登録
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
