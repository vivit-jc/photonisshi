<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { usePhotos } from '../composables/usePhotos'
import { useComments } from '../composables/useComments'
import { useCamera } from '../composables/useCamera'
import PhotoThumbnail from '../components/PhotoThumbnail.vue'
import CommentBubble from '../components/CommentBubble.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const { currentUser } = useAuth()
const { photos, loadTodayPhotos, deletePhoto } = usePhotos()
const { comments, loadTodayComments, addComment, deleteComment } = useComments()
const { openCamera, uploading } = useCamera()

const commentText = ref('')
const loadingData = ref(true)
const confirmTarget = ref(null)
const showConfirm = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
})

const timeline = computed(() => {
  const items = [
    ...photos.value.map(p => ({ type: 'photo', data: p, time: new Date(p.captured_at) })),
    ...comments.value.map(c => ({ type: 'comment', data: c, time: new Date(c.commented_at) })),
  ]
  items.sort((a, b) => a.time - b.time)
  return items
})

onMounted(async () => {
  if (currentUser.value) {
    await Promise.all([
      loadTodayPhotos(currentUser.value.id),
      loadTodayComments(currentUser.value.id),
    ])
  }
  loadingData.value = false
})

async function handleCamera() {
  try {
    await openCamera(currentUser.value.id)
    await loadTodayPhotos(currentUser.value.id)
  } catch (e) {
    if (e.message !== 'cancelled') {
      snackbarMsg.value = '写真のアップロードに失敗しました'
      snackbar.value = true
    }
  }
}

async function handleAddComment() {
  const text = commentText.value.trim()
  if (!text) return
  try {
    await addComment(currentUser.value.id, text)
    commentText.value = ''
    await loadTodayComments(currentUser.value.id)
  } catch {
    snackbarMsg.value = 'コメントの追加に失敗しました'
    snackbar.value = true
  }
}

function requestDelete(type, item) {
  confirmTarget.value = { type, item }
  showConfirm.value = true
}

async function handleConfirmDelete() {
  const { type, item } = confirmTarget.value
  try {
    if (type === 'photo') {
      await deletePhoto(item)
      await loadTodayPhotos(currentUser.value.id)
    } else {
      await deleteComment(item.id)
      await loadTodayComments(currentUser.value.id)
    }
  } catch {
    snackbarMsg.value = '削除に失敗しました'
    snackbar.value = true
  }
  confirmTarget.value = null
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <div class="d-flex align-center mb-4">
      <v-icon class="mr-2" color="primary">mdi-calendar-today</v-icon>
      <span class="text-h6">{{ today }}</span>
    </div>

    <!-- Actions -->
    <div class="d-flex ga-2 mb-4">
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-camera"
        :loading="uploading"
        @click="handleCamera"
      >
        カメラを起動
      </v-btn>
    </div>

    <!-- Comment input -->
    <div class="d-flex ga-2 mb-6">
      <v-text-field
        v-model="commentText"
        label="コメントを入力"
        hide-details
        density="compact"
        @keyup.enter="handleAddComment"
      />
      <v-btn
        icon="mdi-send"
        color="primary"
        variant="tonal"
        :disabled="!commentText.trim()"
        @click="handleAddComment"
      />
    </div>

    <!-- Timeline -->
    <v-progress-circular v-if="loadingData" indeterminate color="primary" class="d-block mx-auto" />

    <div v-else-if="timeline.length === 0" class="text-center text-grey py-8">
      <v-icon size="48" color="grey-lighten-1">mdi-camera-off</v-icon>
      <p class="mt-2">まだ記録がありません</p>
    </div>

    <div v-else class="d-flex flex-column ga-3">
      <template v-for="item in timeline" :key="item.data.id">
        <PhotoThumbnail
          v-if="item.type === 'photo'"
          :photo="item.data"
          @delete="requestDelete('photo', item.data)"
        />
        <CommentBubble
          v-else
          :comment="item.data"
          @delete="requestDelete('comment', item.data)"
        />
      </template>
    </div>

    <ConfirmDialog
      v-model="showConfirm"
      message="この項目を削除しますか？"
      @confirm="handleConfirmDelete"
    />
    <v-snackbar v-model="snackbar" :timeout="3000" color="error">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>
