<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useTags } from '../composables/useTags'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const { currentUser } = useAuth()
const { tags, loadTags, addTag, updateTag, deleteTag, detectOverlaps, reassignAllTags } = useTags()

const loading = ref(true)
const saving = ref(false)
const reassigning = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

// 新規タグフォーム
const newName = ref('')
const newStart = ref('')
const newEnd = ref('')

// 編集
const editingId = ref(null)
const editName = ref('')
const editStart = ref('')
const editEnd = ref('')

// 削除確認
const showConfirm = ref(false)
const deleteTargetId = ref(null)

const overlaps = computed(() => detectOverlaps())

onMounted(async () => {
  await loadTags(currentUser.value.id)
  loading.value = false
})

function showMsg(msg, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function handleAdd() {
  if (!newName.value.trim() || !newStart.value || !newEnd.value) {
    showMsg('全ての項目を入力してください', 'warning')
    return
  }
  saving.value = true
  try {
    await addTag(currentUser.value.id, newName.value.trim(), newStart.value, newEnd.value)
    newName.value = ''
    newStart.value = ''
    newEnd.value = ''
    await loadTags(currentUser.value.id)
    showMsg('タグを追加しました')
  } catch {
    showMsg('タグの追加に失敗しました', 'error')
  } finally {
    saving.value = false
  }
}

function startEdit(tag) {
  editingId.value = tag.id
  editName.value = tag.name
  editStart.value = tag.start_time.slice(0, 5)
  editEnd.value = tag.end_time.slice(0, 5)
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit() {
  if (!editName.value.trim() || !editStart.value || !editEnd.value) return
  saving.value = true
  try {
    await updateTag(editingId.value, {
      name: editName.value.trim(),
      start_time: editStart.value,
      end_time: editEnd.value,
    })
    editingId.value = null
    await loadTags(currentUser.value.id)
    showMsg('タグを更新しました')
  } catch {
    showMsg('タグの更新に失敗しました', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(tagId) {
  deleteTargetId.value = tagId
  showConfirm.value = true
}

async function handleDelete() {
  try {
    await deleteTag(deleteTargetId.value)
    await loadTags(currentUser.value.id)
    showMsg('タグを削除しました')
  } catch {
    showMsg('タグの削除に失敗しました', 'error')
  }
  deleteTargetId.value = null
}

async function handleReassign() {
  reassigning.value = true
  try {
    await reassignAllTags(currentUser.value.id)
    showMsg('全写真のタグを再計算しました')
  } catch {
    showMsg('再計算に失敗しました', 'error')
  } finally {
    reassigning.value = false
  }
}

function formatTime(t) {
  return t ? t.slice(0, 5) : ''
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-4">タグ設定</h2>

    <!-- 重複警告 -->
    <v-alert
      v-if="overlaps.length > 0"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <div class="text-body-2 font-weight-bold mb-1">時間帯の重複があります</div>
      <div v-for="(pair, i) in overlaps" :key="i" class="text-caption">
        「{{ pair[0].name }}」と「{{ pair[1].name }}」が重複（開始時間が早い方が優先されます）
      </div>
    </v-alert>

    <!-- 新規追加フォーム -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <div class="text-body-2 font-weight-bold mb-2">タグを追加</div>
        <v-text-field
          v-model="newName"
          label="タグ名"
          density="compact"
          hide-details
          class="mb-2"
        />
        <div class="d-flex ga-2">
          <v-text-field
            v-model="newStart"
            label="開始時刻"
            type="time"
            density="compact"
            hide-details
          />
          <v-text-field
            v-model="newEnd"
            label="終了時刻"
            type="time"
            density="compact"
            hide-details
          />
        </div>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="mt-3"
          :loading="saving"
          @click="handleAdd"
        >
          追加
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- タグ一覧 -->
    <v-progress-circular v-if="loading" indeterminate color="primary" class="d-block mx-auto" />

    <div v-else-if="tags.length === 0" class="text-center text-grey py-4">
      タグがまだありません
    </div>

    <div v-else class="d-flex flex-column ga-2">
      <v-card v-for="tag in tags" :key="tag.id" variant="outlined">
        <v-card-text class="pa-3">
          <!-- 編集モード -->
          <template v-if="editingId === tag.id">
            <v-text-field
              v-model="editName"
              label="タグ名"
              density="compact"
              hide-details
              class="mb-2"
            />
            <div class="d-flex ga-2 mb-2">
              <v-text-field
                v-model="editStart"
                label="開始時刻"
                type="time"
                density="compact"
                hide-details
              />
              <v-text-field
                v-model="editEnd"
                label="終了時刻"
                type="time"
                density="compact"
                hide-details
              />
            </div>
            <div class="d-flex ga-2">
              <v-btn size="small" color="primary" variant="flat" :loading="saving" @click="saveEdit">保存</v-btn>
              <v-btn size="small" variant="text" @click="cancelEdit">キャンセル</v-btn>
            </div>
          </template>

          <!-- 表示モード -->
          <template v-else>
            <div class="d-flex align-center justify-space-between">
              <div>
                <span class="text-body-2 font-weight-bold">{{ tag.name }}</span>
                <span class="text-caption text-grey ml-2">
                  {{ formatTime(tag.start_time) }} - {{ formatTime(tag.end_time) }}
                </span>
              </div>
              <div class="d-flex ga-1">
                <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="startEdit(tag)" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="confirmDelete(tag.id)" />
              </div>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </div>

    <!-- 再計算ボタン -->
    <v-btn
      v-if="tags.length > 0"
      variant="tonal"
      color="accent"
      size="small"
      class="mt-4"
      :loading="reassigning"
      prepend-icon="mdi-refresh"
      @click="handleReassign"
    >
      全写真のタグを再計算
    </v-btn>

    <ConfirmDialog
      v-model="showConfirm"
      message="このタグを削除しますか？関連する写真のタグは解除されます。"
      @confirm="handleDelete"
    />
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>
