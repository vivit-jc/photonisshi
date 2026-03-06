<script setup>
import { ref, onMounted } from 'vue'
import { useTags } from '../../composables/useTags'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const {
  commonTags, loadCommonTags,
  addCommonTag, updateCommonTag, deleteCommonTag,
} = useTags()

const loading = ref(true)
const saving = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const newName = ref('')
const editingId = ref(null)
const editName = ref('')
const showConfirm = ref(false)
const deleteTargetId = ref(null)

onMounted(async () => {
  await loadCommonTags()
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
    await addCommonTag(newName.value.trim())
    newName.value = ''
    await loadCommonTags()
    showMsg('共通タグを追加しました')
  } catch {
    showMsg('追加に失敗しました', 'error')
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
    await updateCommonTag(editingId.value, editName.value.trim())
    editingId.value = null
    await loadCommonTags()
    showMsg('共通タグを更新しました')
  } catch {
    showMsg('更新に失敗しました', 'error')
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
    await deleteCommonTag(deleteTargetId.value)
    await loadCommonTags()
    showMsg('共通タグを削除しました')
  } catch {
    showMsg('削除に失敗しました', 'error')
  }
  deleteTargetId.value = null
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-2">共通タグ管理</h2>
    <p class="text-body-2 text-grey-darken-1 mb-4">
      共通タグを追加すると、全ユーザーが手元で使えるようになります。よく使うタグ（例：青果、精肉、水産）を登録しておくと、写真の整理に役立ちます。
    </p>

    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <div class="text-body-2 font-weight-bold mb-2">共通タグを追加</div>
        <div class="d-flex ga-2 align-center">
          <v-text-field
            v-model="newName"
            label="タグ名"
            density="compact"
            hide-details
            @keyup.enter="handleAdd"
          />
          <v-btn color="teal" variant="flat" size="small" :loading="saving" @click="handleAdd">追加</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-progress-circular v-if="loading" indeterminate color="teal" class="d-block mx-auto" />

    <div v-else-if="commonTags.length === 0" class="text-center text-grey py-4">
      共通タグがまだありません
    </div>

    <div v-else class="d-flex flex-column ga-2">
      <v-card v-for="tag in commonTags" :key="tag.id" variant="outlined">
        <v-card-text class="pa-3">
          <template v-if="editingId === tag.id">
            <div class="d-flex ga-2 align-center">
              <v-text-field v-model="editName" label="タグ名" density="compact" hide-details @keyup.enter="saveEdit" />
              <v-btn size="small" color="teal" variant="flat" :loading="saving" @click="saveEdit">保存</v-btn>
              <v-btn size="small" variant="text" @click="cancelEdit">取消</v-btn>
            </div>
          </template>
          <template v-else>
            <div class="d-flex align-center justify-space-between">
              <div>
                <v-chip size="small" color="teal" variant="tonal" class="mr-2">共通</v-chip>
                <span class="text-body-2 font-weight-bold">{{ tag.name }}</span>
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

    <ConfirmDialog v-model="showConfirm" message="この共通タグを削除しますか？" @confirm="handleDelete" />
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarMsg }}</v-snackbar>
  </v-container>
</template>
