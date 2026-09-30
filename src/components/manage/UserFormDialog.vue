<script setup>
import { ref, watch } from 'vue'
import { MIN_PASSWORD_LENGTH, userErrorMessage } from '../../composables/useManageUsers'

// editUser が null なら追加、指定されていればユーザー名の変更
// submit は { username, password } を受け取る async 関数（失敗時はダイアログを閉じずにエラー表示）
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editUser: { type: Object, default: null },
  submit: { type: Function, required: true },
})
const emit = defineEmits(['update:modelValue'])

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const errorMsg = ref('')
const loading = ref(false)

watch(() => props.modelValue, (v) => {
  if (!v) return
  username.value = props.editUser?.username ?? ''
  password.value = ''
  passwordConfirm.value = ''
  errorMsg.value = ''
})

async function handleSubmit() {
  const name = username.value.trim()
  if (!name) {
    errorMsg.value = 'ユーザー名を入力してください'
    return
  }
  if (!props.editUser && password.value) {
    if (password.value.length < MIN_PASSWORD_LENGTH) {
      errorMsg.value = `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください`
      return
    }
    if (password.value !== passwordConfirm.value) {
      errorMsg.value = 'パスワードが一致しません'
      return
    }
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await props.submit({ username: name, password: password.value || null })
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
        {{ editUser ? 'ユーザー名を変更' : 'ユーザーを追加' }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="username"
          label="ユーザー名"
          density="compact"
          autocomplete="off"
          hide-details
          class="mb-3"
        />
        <template v-if="!editUser">
          <div class="text-caption text-grey mb-2">
            パスワードを設定すると管理画面にログインできるようになります（空欄なら子アプリのみ）
          </div>
          <v-text-field
            v-model="password"
            label="パスワード（任意）"
            type="password"
            density="compact"
            autocomplete="new-password"
            hide-details
            class="mb-3"
          />
          <v-text-field
            v-model="passwordConfirm"
            label="パスワード（確認）"
            type="password"
            density="compact"
            autocomplete="new-password"
            hide-details
            :disabled="!password"
          />
        </template>
        <div v-if="errorMsg" class="text-caption text-error mt-2">{{ errorMsg }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">キャンセル</v-btn>
        <v-btn color="primary" variant="flat" :loading="loading" @click="handleSubmit">
          {{ editUser ? '更新' : '追加' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
