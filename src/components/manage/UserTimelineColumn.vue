<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePhotos } from '../../composables/usePhotos'
import { useComments } from '../../composables/useComments'
import { useMessages } from '../../composables/useMessages'
import { useTagFilter } from '../../composables/useTagFilter'
import { getTodayJST } from '../../utils/date'
import TagChip from '../../components/TagChip.vue'
import TagFilterSelect from '../../components/TagFilterSelect.vue'
import TagSelector from '../../components/TagSelector.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const props = defineProps({
  user: { type: Object, required: true },
})
const emit = defineEmits(['send-message'])

const { loadPhotos, updatePhoto } = usePhotos()
const { loadComments } = useComments()
const { loadMessages, updateMessage, deleteMessage } = useMessages()
const { selectedTagIds, tagOptions, loadTags } = useTagFilter()

const loading = ref(true)
const items = ref([])
const expandedPhoto = ref(null)
const showFilter = ref(false)
const showTagSelector = ref(false)
const tagSelectorCommentIds = ref([])
const tagSelectorMessageIds = ref([])
const tagSelectorCurrentTags = ref([])

const showEditDialog = ref(false)
const editTarget = ref(null)
const editText = ref('')
const editSaving = ref(false)
const showConfirm = ref(false)
const confirmTarget = ref(null)

// Photo edit dialog
const showPhotoEditDialog = ref(false)
const photoEditTarget = ref(null)
const photoEditDate = ref('')
const photoEditTime = ref('')
const photoEditSaving = ref(false)

const dateFrom = ref(getTodayJST())
const dateTo = ref(getTodayJST())

const timeline = computed(() => {
  return [...items.value].sort((a, b) => new Date(b.time) - new Date(a.time))
})

async function fetchData() {
  loading.value = true
  try {
    const from = dateFrom.value
    const to = dateTo.value
    const fromISO = new Date(from + 'T00:00:00+09:00').toISOString()
    const toEnd = new Date(to + 'T00:00:00+09:00')
    toEnd.setDate(toEnd.getDate() + 1)
    const toISO = toEnd.toISOString()
    const [photoData, commentData, messageData] = await Promise.all([
      loadPhotos(props.user.id, {
        dateFrom: from,
        dateTo: to,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
      }),
      loadComments(props.user.id, { dateFrom: from, dateTo: to }),
      loadMessages(props.user.id, {
        dateFrom: fromISO,
        dateTo: toISO,
      }),
    ])

    const photoItems = photoData.map(p => ({ type: 'photo', data: p, time: p.captured_at }))
    const commentItems = commentData.map(c => ({ type: 'comment', data: c, time: c.commented_at }))
    const messageItems = messageData.map(m => ({ type: 'message', data: m, time: m.created_at }))

    items.value = [...photoItems, ...commentItems, ...messageItems]
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

watch(() => props.user.id, async () => {
  await loadTags(props.user.id)
  await fetchData()
})
watch([dateFrom, dateTo, selectedTagIds], fetchData)
onMounted(async () => {
  await loadTags(props.user.id)
  await fetchData()
})

function openCommentTagSelector(comment) {
  tagSelectorCommentIds.value = [comment.id]
  tagSelectorMessageIds.value = []
  tagSelectorCurrentTags.value = comment.tags || []
  showTagSelector.value = true
}

function openMessageTagSelector(message) {
  tagSelectorMessageIds.value = [message.id]
  tagSelectorCommentIds.value = []
  tagSelectorCurrentTags.value = message.tags || []
  showTagSelector.value = true
}

async function handleTagUpdated() {
  await fetchData()
  // タグトグル後に currentTags を更新して UI に反映する
  if (tagSelectorCommentIds.value.length > 0) {
    const comment = items.value.find(i => i.type === 'comment' && i.data.id === tagSelectorCommentIds.value[0])
    if (comment) tagSelectorCurrentTags.value = comment.data.tags || []
  } else if (tagSelectorMessageIds.value.length > 0) {
    const message = items.value.find(i => i.type === 'message' && i.data.id === tagSelectorMessageIds.value[0])
    if (message) tagSelectorCurrentTags.value = message.data.tags || []
  }
}

function openEditMessage(message) {
  editTarget.value = message
  editText.value = message.content
  showEditDialog.value = true
}

async function handleSaveEdit() {
  const text = editText.value.trim()
  if (!text || !editTarget.value) return
  editSaving.value = true
  try {
    await updateMessage(editTarget.value.id, text)
    showEditDialog.value = false
    editTarget.value = null
    await fetchData()
  } catch (e) {
    console.error(e)
  } finally {
    editSaving.value = false
  }
}

function requestDeleteMessage(message) {
  confirmTarget.value = message
  showConfirm.value = true
}

async function handleConfirmDelete() {
  if (!confirmTarget.value) return
  try {
    await deleteMessage(confirmTarget.value.id)
    await fetchData()
  } catch (e) {
    console.error(e)
  }
  confirmTarget.value = null
}

function openTagSelectorForMessage(messageId) {
  tagSelectorMessageIds.value = [messageId]
  tagSelectorCommentIds.value = []
  tagSelectorCurrentTags.value = []
  showTagSelector.value = true
}

function openPhotoEditDialog(photo) {
  photoEditTarget.value = photo
  photoEditDate.value = photo.diary_date
  const d = new Date(photo.captured_at)
  photoEditTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  showPhotoEditDialog.value = true
}

async function handleSavePhotoEdit() {
  if (!photoEditTarget.value || !photoEditDate.value || !photoEditTime.value) return
  photoEditSaving.value = true
  try {
    const capturedAt = `${photoEditDate.value}T${photoEditTime.value}:00+09:00`
    await updatePhoto(photoEditTarget.value.id, {
      capturedAt,
      diaryDate: photoEditDate.value,
    })
    showPhotoEditDialog.value = false
    photoEditTarget.value = null
    expandedPhoto.value = null
    await fetchData()
  } catch (e) {
    console.error(e)
  } finally {
    photoEditSaving.value = false
  }
}

defineExpose({ refresh: fetchData, openTagSelectorForMessage })
</script>

<template>
  <v-card variant="outlined" class="fill-height">
    <v-card-title class="text-body-1 font-weight-bold pa-3 pb-1">
      <v-icon size="small" class="mr-1">mdi-account</v-icon>
      {{ user.username }}
    </v-card-title>

    <div class="px-3 pt-1 pb-0">
      <v-btn
        variant="text"
        size="x-small"
        :prepend-icon="showFilter ? 'mdi-chevron-up' : 'mdi-filter-outline'"
        @click="showFilter = !showFilter"
      >
        フィルター
      </v-btn>
      <v-expand-transition>
        <div v-show="showFilter" class="d-flex flex-column ga-2 mt-1 mb-2">
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
      </v-expand-transition>
    </div>

    <v-card-text class="pa-2 overflow-y-auto" style="max-height: 60vh">
      <v-progress-circular v-if="loading" indeterminate color="primary" size="24" class="d-block mx-auto" />

      <div v-else-if="timeline.length === 0" class="text-center text-grey text-caption py-4">
        記録なし
      </div>

      <div v-else class="d-flex flex-column ga-2">
        <template v-for="item in timeline" :key="item.data.id">
          <div v-if="item.type === 'photo'" class="timeline-photo" @click="expandedPhoto = item.data">
            <v-img :src="item.data.publicUrl" :aspect-ratio="4/3" cover class="rounded" />
            <div v-if="item.data.caption" class="text-caption mt-1">{{ item.data.caption }}</div>
            <div class="d-flex align-center flex-wrap ga-1 mt-1">
              <span class="text-caption text-grey">{{ formatTime(item.time) }}</span>
              <TagChip v-for="tag in (item.data.tags || [])" :key="tag.id" :tag="tag" />
              <TagChip v-if="item.data.gpsTag" :tag="item.data.gpsTag" type="gps" />
            </div>
          </div>
          <v-card v-if="item.type === 'comment'" variant="tonal" color="grey" class="rounded-lg">
            <v-card-text class="pa-2">
              <div class="text-body-2 text-black" style="white-space: pre-wrap;">{{ item.data.content }}</div>
              <div v-if="item.data.tags && item.data.tags.length > 0" class="d-flex flex-wrap ga-1 mt-1">
                <TagChip v-for="tag in item.data.tags" :key="tag.id" :tag="tag" />
              </div>
              <div class="d-flex align-center mt-1">
                <span class="text-caption text-grey">{{ formatTime(item.time) }}</span>
                <v-btn icon="mdi-tag-outline" variant="text" size="x-small" density="compact" class="ml-1" @click="openCommentTagSelector(item.data)" />
              </div>
            </v-card-text>
          </v-card>
          <v-card v-if="item.type === 'message'" variant="tonal" color="green" class="rounded-lg">
            <v-card-text class="pa-2">
              <div v-if="item.data.message_type === 'stamp'" class="text-h5">{{ item.data.content }}</div>
              <div v-else class="text-body-2" style="white-space: pre-wrap;">{{ item.data.content }}</div>
              <div v-if="item.data.tags && item.data.tags.length > 0" class="d-flex flex-wrap ga-1 mt-1">
                <TagChip v-for="tag in item.data.tags" :key="tag.id" :tag="tag" />
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon size="x-small" class="mr-1 text-grey">mdi-message-text</v-icon>
                <span class="text-caption text-grey">{{ formatTime(item.time) }}</span>
                <v-btn v-if="item.data.message_type !== 'stamp'" icon="mdi-pencil-outline" variant="text" size="x-small" density="compact" color="grey-darken-1" class="ml-1" @click="openEditMessage(item.data)" />
                <v-btn icon="mdi-tag-outline" variant="text" size="x-small" density="compact" color="primary" class="ml-1" @click="openMessageTagSelector(item.data)" />
                <v-btn icon="mdi-delete-outline" variant="text" size="x-small" density="compact" color="error" class="ml-1" @click="requestDeleteMessage(item.data)" />
              </div>
            </v-card-text>
          </v-card>
        </template>
      </div>
    </v-card-text>

    <!-- 写真拡大ダイアログ -->
    <v-dialog v-model="expandedPhoto" max-width="600">
      <v-card v-if="expandedPhoto">
        <v-img :src="expandedPhoto.publicUrl" max-height="80vh" contain />
        <v-card-text v-if="expandedPhoto.caption" class="pa-3 pb-0 text-body-2">
          {{ expandedPhoto.caption }}
        </v-card-text>
        <v-card-actions>
          <v-btn
            size="small"
            variant="text"
            color="grey-darken-1"
            prepend-icon="mdi-pencil-outline"
            @click="openPhotoEditDialog(expandedPhoto)"
          >
            日時を編集
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="expandedPhoto = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <TagSelector
      v-model="showTagSelector"
      :comment-ids="tagSelectorCommentIds"
      :message-ids="tagSelectorMessageIds"
      :current-tags="tagSelectorCurrentTags"
      :user-id="user.id"
      @updated="handleTagUpdated"
    />

    <!-- 写真日時編集ダイアログ -->
    <v-dialog v-model="showPhotoEditDialog" max-width="400">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold">写真の日時を編集</v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-text-field
            v-model="photoEditDate"
            type="date"
            label="日付"
            hide-details
            density="compact"
          />
          <v-text-field
            v-model="photoEditTime"
            type="time"
            label="時刻"
            hide-details
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPhotoEditDialog = false">キャンセル</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="photoEditSaving"
            :disabled="!photoEditDate || !photoEditTime"
            @click="handleSavePhotoEdit"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- メッセージ編集ダイアログ -->
    <v-dialog v-model="showEditDialog" max-width="400">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold">メッセージを編集</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editText"
            label="メッセージ"
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

    <ConfirmDialog
      v-model="showConfirm"
      message="このメッセージを削除しますか？"
      @confirm="handleConfirmDelete"
    />
  </v-card>
</template>

<style scoped>
.timeline-photo {
  cursor: pointer;
  width: 50%;
}
</style>
