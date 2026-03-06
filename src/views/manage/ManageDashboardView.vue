<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../plugins/supabase'
import { useMessages } from '../../composables/useMessages'
import UserTimelineColumn from '../../components/manage/UserTimelineColumn.vue'
import MessageInput from '../../components/manage/MessageInput.vue'

const { sendMessage } = useMessages()

const users = ref([])
const selectedUserIds = ref([])
const loading = ref(true)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')
const columnRefs = ref({})

const MAX_COLUMNS = 3

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
})

const selectedUsers = computed(() =>
  users.value.filter(u => selectedUserIds.value.includes(u.id))
)

// Column width based on selected count
const columnClass = computed(() => {
  const count = selectedUsers.value.length
  if (count <= 1) return 'flex-grow-1'
  if (count === 2) return 'w-50'
  return 'w-33'
})

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('username', { ascending: true })
    if (error) throw error
    users.value = data
    // Default: select up to 3 users
    selectedUserIds.value = data.slice(0, MAX_COLUMNS).map(u => u.id)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function toggleUser(userId) {
  const idx = selectedUserIds.value.indexOf(userId)
  if (idx >= 0) {
    selectedUserIds.value.splice(idx, 1)
  } else if (selectedUserIds.value.length < MAX_COLUMNS) {
    selectedUserIds.value.push(userId)
  }
}

async function handleSendMessage(userId, { content, type }) {
  try {
    await sendMessage(userId, content, type)
    snackbarMsg.value = 'メッセージを送信しました'
    snackbarColor.value = 'success'
    snackbar.value = true
    // Refresh the column
    columnRefs.value[userId]?.refresh()
  } catch {
    snackbarMsg.value = 'メッセージの送信に失敗しました'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

function setColumnRef(userId, el) {
  if (el) columnRefs.value[userId] = el
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <div class="d-flex align-center mb-4">
      <v-icon class="mr-2" color="teal">mdi-calendar-today</v-icon>
      <span class="text-h6">{{ today }}</span>
    </div>

    <v-progress-circular v-if="loading" indeterminate color="teal" class="d-block mx-auto" />

    <template v-else>
      <!-- User selector -->
      <div class="text-caption text-grey mb-1">クリックでON/OFF切替</div>
      <div class="d-flex flex-wrap ga-1 mb-4">
        <v-chip
          v-for="user in users"
          :key="user.id"
          :color="selectedUserIds.includes(user.id) ? 'teal' : undefined"
          :variant="selectedUserIds.includes(user.id) ? 'flat' : 'outlined'"
          size="small"
          @click="toggleUser(user.id)"
        >
          {{ user.username }}
        </v-chip>
      </div>

      <div v-if="selectedUsers.length === 0" class="text-center text-grey py-8">
        ユーザーを選択してください
      </div>

      <!-- Timeline columns -->
      <div v-else class="d-flex ga-3" style="overflow-x: auto">
        <div
          v-for="user in selectedUsers"
          :key="user.id"
          :class="columnClass"
          style="min-width: 280px"
        >
          <UserTimelineColumn
            :ref="(el) => setColumnRef(user.id, el)"
            :user="user"
          />
          <div class="mt-2">
            <MessageInput @send="(msg) => handleSendMessage(user.id, msg)" />
          </div>
        </div>
      </div>
    </template>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>
