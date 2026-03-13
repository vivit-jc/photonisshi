<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { usePhotos } from '../../composables/usePhotos'
import { useComments } from '../../composables/useComments'
import { useMessages } from '../../composables/useMessages'
import { useTagFilter } from '../../composables/useTagFilter'
import TagChip from '../../components/TagChip.vue'
import TagFilterSelect from '../../components/TagFilterSelect.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import TagSelector from '../../components/child/TagSelector.vue'

const { currentUser } = useAuth()
const { loadPhotos, deletePhoto } = usePhotos()
const { loadComments, updateComment, deleteComment } = useComments()
const { loadMessages } = useMessages()
const { selectedTagIds, tagOptions, loadTags } = useTagFilter()

const loading = ref(true)
const items = ref([])
const expandedPhoto = ref(null)
const expandedComment = ref(null)
const showConfirm = ref(false)
const confirmTarget = ref(null)
const snackbar = ref(false)
const snackbarMsg = ref('')
const showEditDialog = ref(false)
const editTarget = ref(null)
const editText = ref('')
const editSaving = ref(false)

// Tag selector
const showTagSelector = ref(false)
const tagSelectorPhotoId = ref(null)
const tagSelectorCurrentTags = ref([])

// Date range filter: default 7 days
const dateFrom = ref(getDefaultFrom())
const dateTo = ref(getToday())

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日付ごとにグルーピング
const groupedByDate = computed(() => {
  const groups = {}
  for (const item of items.value) {
    const date = item.diary_date
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({
      date,
      label: formatDate(date),
      entries: entries.sort((a, b) => new Date(a.time) - new Date(b.time)),
    }))
})

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`
}

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function fetchData() {
  loading.value = true
  try {
    const userId = currentUser.value.id
    const [photoData, commentData, messageData] = await Promise.all([
      loadPhotos(userId, {
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
      }),
      loadComments(userId, {
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
      }),
      loadMessages(userId, {
        dateFrom: `${dateFrom.value}T00:00:00`,
        dateTo: `${dateTo.value}T23:59:59`,
      }),
    ])

    const photoItems = photoData.map(p => ({
      type: 'photo',
      data: p,
      diary_date: p.diary_date,
      time: p.captured_at,
    }))

    const commentItems = commentData.map(c => ({
      type: 'comment',
      data: c,
      diary_date: c.diary_date,
      time: c.commented_at,
    }))

    const messageItems = messageData.map(m => ({
      type: 'message',
      data: m,
      diary_date: m.created_at.slice(0, 10),
      time: m.created_at,
    }))

    items.value = [...photoItems, ...commentItems, ...messageItems]
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch([dateFrom, dateTo, selectedTagIds], fetchData)

onMounted(async () => {
  await loadTags(currentUser.value.id)
  await fetchData()
})

function requestDeletePhoto(photo) {
  confirmTarget.value = { type: 'photo', item: photo }
  showConfirm.value = true
}

function requestDeleteComment(comment) {
  confirmTarget.value = { type: 'comment', item: comment }
  showConfirm.value = true
}

async function handleConfirmDelete() {
  const { type, item } = confirmTarget.value
  try {
    if (type === 'photo') {
      await deletePhoto(item)
      expandedPhoto.value = null
    } else {
      await deleteComment(item.id)
      expandedComment.value = null
    }
    await fetchData()
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
    expandedComment.value = null
    editTarget.value = null
    await fetchData()
  } catch {
    snackbarMsg.value = 'コメントの更新に失敗しました'
    snackbar.value = true
  } finally {
    editSaving.value = false
  }
}

function openTagSelector(photo) {
  tagSelectorPhotoId.value = photo.id
  tagSelectorCurrentTags.value = photo.tags || []
  showTagSelector.value = true
}

async function handleTagUpdated() {
  await fetchData()
  const photo = items.value.find(i => i.type === 'photo' && i.data.id === tagSelectorPhotoId.value)
  if (photo) tagSelectorCurrentTags.value = photo.data.tags || []
}
</script>

<template>
  <div class="timeline-bg">
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-3">タイムライン</h2>

    <!-- フィルター -->
    <div class="d-flex flex-column ga-2 mb-4">
      <div class="d-flex ga-2">
        <v-text-field
          v-model="dateFrom"
          type="date"
          label="開始日"
          density="compact"
          hide-details
        />
        <v-text-field
          v-model="dateTo"
          type="date"
          label="終了日"
          density="compact"
          hide-details
        />
      </div>
      <TagFilterSelect v-model="selectedTagIds" :options="tagOptions" />
    </div>

    <v-progress-circular v-if="loading" indeterminate color="primary" class="d-block mx-auto" />

    <div v-else-if="groupedByDate.length === 0" class="text-center text-grey py-8">
      データがありません
    </div>

    <div v-else class="d-flex flex-column ga-4">
      <div v-for="group in groupedByDate" :key="group.date">
        <div class="text-body-2 font-weight-bold mb-2 text-grey-darken-1">
          {{ group.label }}
        </div>

        <div class="image-grid">
          <template v-for="item in group.entries" :key="item.data.id">
            <div v-if="item.type === 'photo'" class="grid-item" @click="expandedPhoto = item.data">
              <v-img :src="item.data.publicUrl" :aspect-ratio="1" cover class="rounded" />
              <div class="grid-overlay">
                <span class="text-caption">{{ formatTime(item.time) }}</span>
              </div>
            </div>
            <div
              v-else-if="item.type === 'comment'"
              class="grid-item grid-comment rounded pa-2 d-flex flex-column justify-center"
              @click="expandedComment = item.data"
            >
              <div class="text-caption text-truncate-2">{{ item.data.content }}</div>
              <div class="text-caption text-grey mt-auto">{{ formatTime(item.time) }}</div>
            </div>
            <div
              v-else-if="item.type === 'message'"
              class="grid-item grid-message rounded pa-2 d-flex flex-column justify-center"
            >
              <div v-if="item.data.message_type === 'stamp'" class="text-h5 text-center">{{ item.data.content }}</div>
              <div v-else class="text-caption text-truncate-2">{{ item.data.content }}</div>
              <div class="text-caption text-grey mt-auto">
                <v-icon size="x-small">mdi-message-text</v-icon>
                {{ formatTime(item.time) }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 写真拡大ダイアログ -->
    <v-dialog v-model="expandedPhoto" max-width="600" :scrim="true">
      <v-card v-if="expandedPhoto">
        <v-img :src="expandedPhoto.publicUrl" max-height="80vh" contain />
        <v-card-text v-if="expandedPhoto.caption" class="pa-3 pb-0 text-body-2">
          {{ expandedPhoto.caption }}
        </v-card-text>
        <v-card-text class="pa-3 d-flex align-center flex-wrap ga-1">
          <span class="text-caption text-grey mr-2">
            {{ formatTime(expandedPhoto.captured_at) }}
          </span>
          <TagChip v-for="tag in (expandedPhoto.tags || [])" :key="tag.id" :tag="tag" />
          <TagChip v-if="expandedPhoto.gpsTag" :tag="expandedPhoto.gpsTag" type="gps" />
        </v-card-text>
        <v-card-actions>
          <v-btn
            icon="mdi-delete-outline"
            color="error"
            variant="text"
            size="small"
            @click="requestDeletePhoto(expandedPhoto)"
          />
          <v-btn
            icon="mdi-tag-outline"
            color="primary"
            variant="text"
            size="small"
            @click="openTagSelector(expandedPhoto)"
          />
          <v-spacer />
          <v-btn variant="text" @click="expandedPhoto = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- コメント全文ダイアログ -->
    <v-dialog v-model="expandedComment" max-width="400">
      <v-card v-if="expandedComment">
        <v-card-text class="pa-4">
          <div class="text-body-1" style="white-space: pre-wrap;">{{ expandedComment.content }}</div>
          <div class="text-caption text-grey mt-2">
            {{ formatTime(expandedComment.commented_at) }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn icon="mdi-delete-outline" color="error" variant="text" size="small" @click="requestDeleteComment(expandedComment)" />
          <v-btn icon="mdi-pencil-outline" color="grey-darken-1" variant="text" size="small" @click="openEditDialog(expandedComment)" />
          <v-spacer />
          <v-btn variant="text" @click="expandedComment = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
          <v-btn color="primary" variant="flat" :loading="editSaving" :disabled="!editText.trim()" @click="handleSaveEdit">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Tag Selector -->
    <TagSelector
      v-model="showTagSelector"
      :photo-id="tagSelectorPhotoId"
      :current-tags="tagSelectorCurrentTags"
      @updated="handleTagUpdated"
    />

    <ConfirmDialog v-model="showConfirm" message="この項目を削除しますか？" @confirm="handleConfirmDelete" />
    <v-snackbar v-model="snackbar" :timeout="3000" color="error">{{ snackbarMsg }}</v-snackbar>
  </v-container>
  </div>
</template>

<style scoped>
.timeline-bg {
  background-color: #fffff0;
  min-height: 100vh;
}
.timeline-bg :deep(.v-field),
.timeline-bg :deep(.v-card) {
  background-color: #fff;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.grid-item {
  position: relative;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
}
.grid-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.5));
  color: white;
  padding: 2px 4px;
  text-align: right;
}
.grid-comment {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  min-height: 0;
}
.grid-message {
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  min-height: 0;
}
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
