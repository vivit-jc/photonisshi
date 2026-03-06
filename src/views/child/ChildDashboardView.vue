<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../plugins/supabase'
import { useAuth } from '../../composables/useAuth'
import { usePhotos } from '../../composables/usePhotos'
import { useComments } from '../../composables/useComments'
import { useCamera } from '../../composables/useCamera'
import { useMessages } from '../../composables/useMessages'
import PhotoThumbnail from '../../components/PhotoThumbnail.vue'
import CommentBubble from '../../components/CommentBubble.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import PhotoCaptionDialog from '../../components/child/PhotoCaptionDialog.vue'
import TagSelector from '../../components/child/TagSelector.vue'

const { currentUser } = useAuth()
const { photos, loadTodayPhotos, deletePhoto } = usePhotos()
const { comments, loadTodayComments, addComment, updateComment, deleteComment } = useComments()
const { pickAndCompress, uploadPhoto, uploading } = useCamera()
const { messages, loadTodayMessages } = useMessages()

const commentText = ref('')
const loadingData = ref(true)
const confirmTarget = ref(null)
const showConfirm = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const errorDetail = ref('')
const showErrorDialog = ref(false)
const editTarget = ref(null)
const editText = ref('')
const showEditDialog = ref(false)
const editSaving = ref(false)

// Caption dialog state
const showCaptionDialog = ref(false)
const pendingBlob = ref(null)
const pendingPosition = ref(null)
const previewUrl = ref(null)

// Tag selector state
const showTagSelector = ref(false)
const tagSelectorPhotoId = ref(null)
const tagSelectorCurrentTags = ref([])

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
})

const timeline = computed(() => {
  const items = [
    ...photos.value.map(p => ({ type: 'photo', data: p, time: new Date(p.captured_at) })),
    ...comments.value.map(c => ({ type: 'comment', data: c, time: new Date(c.commented_at) })),
    ...messages.value.map(m => ({ type: 'message', data: m, time: new Date(m.created_at) })),
  ]
  items.sort((a, b) => a.time - b.time)
  return items
})

let messageSubscription = null

onMounted(async () => {
  if (currentUser.value) {
    await Promise.all([
      loadTodayPhotos(currentUser.value.id),
      loadTodayComments(currentUser.value.id),
      loadTodayMessages(currentUser.value.id),
    ])

    // Subscribe to new messages in realtime
    messageSubscription = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${currentUser.value.id}`,
        },
        () => {
          loadTodayMessages(currentUser.value.id)
        },
      )
      .subscribe()
  }
  loadingData.value = false
})

onUnmounted(() => {
  if (messageSubscription) {
    supabase.removeChannel(messageSubscription)
  }
})

async function reload() {
  await Promise.all([
    loadTodayPhotos(currentUser.value.id),
    loadTodayMessages(currentUser.value.id),
  ])
}

async function handleCamera(useCapture = true) {
  try {
    const { blob, position } = await pickAndCompress(useCapture)
    pendingBlob.value = blob
    pendingPosition.value = position
    previewUrl.value = URL.createObjectURL(blob)
    showCaptionDialog.value = true
  } catch (e) {
    if (e.message !== 'cancelled') {
      errorDetail.value = e.message || JSON.stringify(e)
      showErrorDialog.value = true
    }
  }
}

async function handleCaptionSubmit(caption) {
  try {
    const photoId = await uploadPhoto(
      currentUser.value.id,
      pendingBlob.value,
      caption,
      pendingPosition.value,
    )
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    pendingBlob.value = null
    pendingPosition.value = null
    previewUrl.value = null

    await reload()

    // Open tag selector for newly uploaded photo
    const uploaded = photos.value.find(p => p.id === photoId)
    if (uploaded) {
      tagSelectorPhotoId.value = photoId
      tagSelectorCurrentTags.value = uploaded.tags || []
      showTagSelector.value = true
    }
  } catch (e) {
    errorDetail.value = e.message || JSON.stringify(e)
    showErrorDialog.value = true
  }
}

function openTagSelector(photo) {
  tagSelectorPhotoId.value = photo.id
  tagSelectorCurrentTags.value = photo.tags || []
  showTagSelector.value = true
}

async function handleTagUpdated() {
  await loadTodayPhotos(currentUser.value.id)
  const photo = photos.value.find(p => p.id === tagSelectorPhotoId.value)
  if (photo) tagSelectorCurrentTags.value = photo.tags || []
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

function openEditDialog(comment) {
  editTarget.value = comment
  editText.value = comment.content
  showEditDialog.value = true
}

async function handleSaveEdit() {
  const text = editText.value.trim()
  if (!text || !editTarget.value) return
  editSaving.value = true
  try {
    await updateComment(editTarget.value.id, text)
    showEditDialog.value = false
    editTarget.value = null
    await loadTodayComments(currentUser.value.id)
  } catch {
    snackbarMsg.value = 'コメントの更新に失敗しました'
    snackbar.value = true
  } finally {
    editSaving.value = false
  }
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
        @click="handleCamera(true)"
      >
        カメラを起動
      </v-btn>
      <v-btn
        color="secondary"
        variant="flat"
        prepend-icon="mdi-image"
        :loading="uploading"
        @click="handleCamera(false)"
      >
        写真を貼る
      </v-btn>
    </div>

    <!-- Comment input -->
    <div class="d-flex ga-2 mb-6 align-end">
      <v-textarea
        v-model="commentText"
        label="コメントを入力"
        hide-details
        density="compact"
        rows="1"
        auto-grow
        max-rows="5"
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
      <v-icon size="48" color="grey">mdi-camera-off</v-icon>
      <p class="mt-2">まだ記録がありません</p>
    </div>

    <div v-else class="d-flex flex-column ga-3">
      <template v-for="item in timeline" :key="item.data.id">
        <PhotoThumbnail
          v-if="item.type === 'photo'"
          :photo="item.data"
          @delete="requestDelete('photo', item.data)"
          @tag="openTagSelector(item.data)"
        />
        <CommentBubble
          v-else-if="item.type === 'comment'"
          :comment="item.data"
          @edit="openEditDialog(item.data)"
          @delete="requestDelete('comment', item.data)"
        />
        <!-- Message from parent -->
        <v-card v-else-if="item.type === 'message'" variant="tonal" color="green" class="message-bubble">
          <v-card-text class="pa-3">
            <div v-if="item.data.message_type === 'stamp'" class="text-h4">{{ item.data.content }}</div>
            <div v-else class="text-body-2" style="white-space: pre-wrap;">{{ item.data.content }}</div>
            <div class="text-caption text-grey mt-1">
              {{ new Date(item.data.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }}
            </div>
          </v-card-text>
        </v-card>
      </template>
    </div>

    <!-- Caption Dialog -->
    <PhotoCaptionDialog
      v-model="showCaptionDialog"
      :preview-url="previewUrl"
      @submit="handleCaptionSubmit"
    />

    <!-- Tag Selector -->
    <TagSelector
      v-model="showTagSelector"
      :photo-id="tagSelectorPhotoId"
      :current-tags="tagSelectorCurrentTags"
      @updated="handleTagUpdated"
    />

    <ConfirmDialog
      v-model="showConfirm"
      message="この項目を削除しますか？"
      @confirm="handleConfirmDelete"
    />

    <!-- コメント編集ダイアログ -->
    <v-dialog v-model="showEditDialog" max-width="400">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold">コメントを編集</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editText"
            label="コメント"
            hide-details
            density="compact"
            rows="3"
            auto-grow
            max-rows="8"
            autofocus
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">キャンセル</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="editSaving"
            :disabled="!editText.trim()"
            @click="handleSaveEdit"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- エラー詳細ダイアログ -->
    <v-dialog v-model="showErrorDialog" max-width="400">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold text-error">
          アップロードエラー
        </v-card-title>
        <v-card-text>
          <code class="d-block text-caption pa-2 bg-grey-lighten-4 rounded" style="word-break: break-all; white-space: pre-wrap;">{{ errorDetail }}</code>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showErrorDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" color="error">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.message-bubble {
  border-radius: 12px !important;
  border-top-right-radius: 4px !important;
}
</style>
