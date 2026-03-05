<script setup>
import { ref, onMounted } from 'vue'
import { useGpsTags } from '../../composables/useGpsTags'
import GpsTagForm from '../../components/manage/GpsTagForm.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const { gpsTags, loadGpsTags, addGpsTag, updateGpsTag, deleteGpsTag } = useGpsTags()

const loading = ref(true)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const showForm = ref(false)
const editTag = ref(null)
const showConfirm = ref(false)
const deleteTargetId = ref(null)

onMounted(async () => {
  await loadGpsTags()
  loading.value = false
})

function showMsg(msg, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function openAdd() {
  editTag.value = null
  showForm.value = true
}

function openEdit(tag) {
  editTag.value = tag
  showForm.value = true
}

async function handleSubmit({ name, latitude, longitude }) {
  try {
    if (editTag.value) {
      await updateGpsTag(editTag.value.id, { name, latitude, longitude })
      showMsg('GPSタグを更新しました')
    } else {
      await addGpsTag(name, latitude, longitude)
      showMsg('GPSタグを追加しました')
    }
    await loadGpsTags()
  } catch {
    showMsg('操作に失敗しました', 'error')
  }
}

function confirmDelete(tagId) {
  deleteTargetId.value = tagId
  showConfirm.value = true
}

async function handleDelete() {
  try {
    await deleteGpsTag(deleteTargetId.value)
    await loadGpsTags()
    showMsg('GPSタグを削除しました')
  } catch {
    showMsg('削除に失敗しました', 'error')
  }
  deleteTargetId.value = null
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h6">GPSタグ管理</h2>
      <v-btn color="teal" variant="flat" size="small" prepend-icon="mdi-plus" @click="openAdd">追加</v-btn>
    </div>

    <v-progress-circular v-if="loading" indeterminate color="teal" class="d-block mx-auto" />

    <div v-else-if="gpsTags.length === 0" class="text-center text-grey py-8">
      GPSタグがまだありません
    </div>

    <div v-else class="d-flex flex-column ga-2">
      <v-card v-for="tag in gpsTags" :key="tag.id" variant="outlined">
        <v-card-text class="pa-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <v-icon size="small" color="orange" class="mr-1">mdi-map-marker</v-icon>
              <span class="text-body-2 font-weight-bold">{{ tag.name }}</span>
              <div class="text-caption text-grey mt-1">
                {{ tag.latitude.toFixed(6) }}, {{ tag.longitude.toFixed(6) }}
              </div>
            </div>
            <div class="d-flex ga-1">
              <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="openEdit(tag)" />
              <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="confirmDelete(tag.id)" />
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <GpsTagForm v-model="showForm" :edit-tag="editTag" @submit="handleSubmit" />
    <ConfirmDialog v-model="showConfirm" message="このGPSタグを削除しますか？" @confirm="handleDelete" />
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarMsg }}</v-snackbar>
  </v-container>
</template>
