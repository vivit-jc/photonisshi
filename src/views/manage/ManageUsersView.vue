<script setup>
import { ref, onMounted } from 'vue'
import { useManageAuth } from '../../composables/useManageAuth'
import { useManageUsers, userErrorMessage } from '../../composables/useManageUsers'
import UserFormDialog from '../../components/manage/UserFormDialog.vue'
import UserPasswordDialog from '../../components/manage/UserPasswordDialog.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const { adminUser } = useManageAuth()
const { manageUsers, loadManageUsers, addUser, renameUser, setUserPassword } = useManageUsers()

const loading = ref(true)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const showForm = ref(false)
const editUser = ref(null)
const showPassword = ref(false)
const passwordTarget = ref(null)
const showConfirm = ref(false)
const clearTarget = ref(null)

onMounted(async () => {
  try {
    await loadManageUsers()
  } catch (e) {
    showMsg(userErrorMessage(e, 'ユーザー一覧の取得に失敗しました'), 'error')
  } finally {
    loading.value = false
  }
})

function showMsg(msg, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function isMe(user) {
  return user.id === adminUser.value?.id
}

async function reload() {
  try {
    await loadManageUsers()
  } catch (e) {
    showMsg(userErrorMessage(e, 'ユーザー一覧の取得に失敗しました'), 'error')
  }
}

function openAdd() {
  editUser.value = null
  showForm.value = true
}

function openRename(user) {
  editUser.value = user
  showForm.value = true
}

async function submitUserForm({ username, password }) {
  if (editUser.value) {
    await renameUser(editUser.value.id, username)
    showMsg('ユーザー名を変更しました')
  } else {
    await addUser(username, password)
    showMsg('ユーザーを追加しました')
  }
  await reload()
}

function openPassword(user) {
  passwordTarget.value = user
  showPassword.value = true
}

async function submitPassword(password) {
  await setUserPassword(passwordTarget.value.id, password)
  showMsg('パスワードを設定しました')
  await reload()
}

function confirmClearPassword(user) {
  clearTarget.value = user
  showConfirm.value = true
}

async function handleClearPassword() {
  try {
    await setUserPassword(clearTarget.value.id, null)
    showMsg('パスワードを解除しました')
    await reload()
  } catch (e) {
    showMsg(userErrorMessage(e, '解除に失敗しました'), 'error')
  }
  clearTarget.value = null
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h6">ユーザー管理</h2>
      <v-btn color="teal" variant="flat" size="small" prepend-icon="mdi-plus" @click="openAdd">追加</v-btn>
    </div>

    <v-progress-circular v-if="loading" indeterminate color="teal" class="d-block mx-auto" />

    <div v-else-if="manageUsers.length === 0" class="text-center text-grey py-8">
      ユーザーがまだいません
    </div>

    <div v-else class="d-flex flex-column ga-2">
      <v-card v-for="user in manageUsers" :key="user.id" variant="outlined">
        <v-card-text class="pa-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <v-icon size="small" color="teal" class="mr-1">mdi-account</v-icon>
              <span class="text-body-2 font-weight-bold">{{ user.username }}</span>
              <span v-if="isMe(user)" class="text-caption text-grey ml-1">（自分）</span>
              <div class="mt-1">
                <v-chip v-if="user.is_admin" size="x-small" color="deep-orange" variant="tonal" class="mr-1">
                  admin
                </v-chip>
                <v-chip v-if="user.has_password" size="x-small" color="teal" variant="tonal" prepend-icon="mdi-shield-account">
                  管理画面ログイン可
                </v-chip>
                <v-chip v-else size="x-small" variant="tonal">パスワード未設定</v-chip>
              </div>
            </div>
            <div class="d-flex ga-1">
              <v-btn icon="mdi-pencil" size="x-small" variant="text" title="ユーザー名を変更" @click="openRename(user)" />
              <v-btn
                icon="mdi-key-variant"
                size="x-small"
                variant="text"
                :title="user.has_password ? 'パスワードを変更' : 'パスワードを設定'"
                @click="openPassword(user)"
              />
              <v-btn
                v-if="user.has_password && !isMe(user)"
                icon="mdi-key-remove"
                size="x-small"
                variant="text"
                color="error"
                title="パスワードを解除"
                @click="confirmClearPassword(user)"
              />
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <UserFormDialog v-model="showForm" :edit-user="editUser" :submit="submitUserForm" />
    <UserPasswordDialog v-model="showPassword" :user="passwordTarget" :submit="submitPassword" />
    <ConfirmDialog
      v-model="showConfirm"
      :message="`${clearTarget?.username ?? ''} のパスワードを解除しますか？解除すると管理画面にログインできなくなります。`"
      confirm-text="解除"
      @confirm="handleClearPassword"
    />
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarMsg }}</v-snackbar>
  </v-container>
</template>
