<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useTags } from '../../composables/useTags'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const { currentUser } = useAuth()
const {
  manualTags, commonTags,
  loadManualTags, loadCommonTags,
  addManualTag, updateManualTag, deleteManualTag,
} = useTags()

const loading = ref(true)
const saving = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

// 新規タグフォーム
const newName = ref('')

// 編集
const editingId = ref(null)
const editName = ref('')

// 削除確認
const showConfirm = ref(false)
const deleteTargetId = ref(null)

onMounted(async () => {
  await Promise.all([
    loadManualTags(currentUser.value.id),
    loadCommonTags(),
  ])
  loading.value = false
})

function showMsg(msg, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function handleAdd() {
  if (!newName.value.trim()) {
    showMsg('タグ名を入力してください', 'warning')
    return
  }
  saving.value = true
  try {
    await addManualTag(currentUser.value.id, newName.value.trim())
    newName.value = ''
    await loadManualTags(currentUser.value.id)
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
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit() {
  if (!editName.value.trim()) return
  saving.value = true
  try {
    await updateManualTag(editingId.value, editName.value.trim())
    editingId.value = null
    await loadManualTags(currentUser.value.id)
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
    await deleteManualTag(deleteTargetId.value)
    await loadManualTags(currentUser.value.id)
    showMsg('タグを削除しました')
  } catch {
    showMsg('タグの削除に失敗しました', 'error')
  }
  deleteTargetId.value = null
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-4">タグ設定</h2>

    <!-- 新規追加フォーム -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <div class="text-body-2 font-weight-bold mb-2">手動タグを追加</div>
        <div class="d-flex ga-2 align-center">
          <v-text-field
            v-model="newName"
            label="タグ名"
            density="compact"
            hide-details
            @keyup.enter="handleAdd"
          />
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            :loading="saving"
            @click="handleAdd"
          >
            追加
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-progress-circular v-if="loading" indeterminate color="primary" class="d-block mx-auto" />

    <template v-else>
      <!-- 手動タグ一覧 -->
      <div class="text-body-2 font-weight-bold mb-2">手動タグ</div>
      <div v-if="manualTags.length === 0" class="text-center text-grey py-4 mb-4">
        手動タグがまだありません
      </div>
      <div v-else class="d-flex flex-column ga-2 mb-4">
        <v-card v-for="tag in manualTags" :key="tag.id" variant="outlined">
          <v-card-text class="pa-3">
            <template v-if="editingId === tag.id">
              <div class="d-flex ga-2 align-center">
                <v-text-field
                  v-model="editName"
                  label="タグ名"
                  density="compact"
                  hide-details
                  @keyup.enter="saveEdit"
                />
                <v-btn size="small" color="primary" variant="flat" :loading="saving" @click="saveEdit">保存</v-btn>
                <v-btn size="small" variant="text" @click="cancelEdit">取消</v-btn>
              </div>
            </template>
            <template v-else>
              <div class="d-flex align-center justify-space-between">
                <span class="text-body-2 font-weight-bold">{{ tag.name }}</span>
                <div class="d-flex ga-1">
                  <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="startEdit(tag)" />
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="confirmDelete(tag.id)" />
                </div>
              </div>
            </template>
          </v-card-text>
        </v-card>
      </div>

      <!-- 共通タグ（読み取り専用） -->
      <div class="text-body-2 font-weight-bold mb-2">共通タグ</div>
      <div v-if="commonTags.length === 0" class="text-center text-grey py-4">
        共通タグがまだありません
      </div>
      <div v-else class="d-flex flex-wrap ga-1">
        <v-chip
          v-for="tag in commonTags"
          :key="tag.id"
          color="teal"
          variant="tonal"
          size="small"
        >
          {{ tag.name }}
        </v-chip>
      </div>
    </template>

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
