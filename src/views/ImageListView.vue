<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { usePhotos } from '../composables/usePhotos'
import { useComments } from '../composables/useComments'
import { useTags } from '../composables/useTags'
import TagChip from '../components/TagChip.vue'

const { currentUser } = useAuth()
const { loadPhotos } = usePhotos()
const { loadComments } = useComments()
const { tags, loadTags } = useTags()

const loading = ref(true)
const items = ref([])
const selectedMonth = ref(getCurrentMonth())
const selectedTagId = ref(null)
const expandedPhoto = ref(null)
const expandedComment = ref(null)

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 月選択用リスト（過去12ヶ月）
const monthOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    options.push({ title: label, value: val })
  }
  return options
})

const tagOptions = computed(() => [
  { title: 'すべて', value: null },
  ...tags.value.map(t => ({ title: t.name, value: t.id })),
  { title: 'タグなし', value: '__none__' },
])

// 日付ごとにグルーピング
const groupedByDate = computed(() => {
  const groups = {}
  for (const item of items.value) {
    const date = item.diary_date || item.data?.diary_date
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  // 日付降順
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
    const filter = { month: selectedMonth.value }
    const tagFilter = selectedTagId.value === '__none__'
      ? null
      : selectedTagId.value

    const [photoData, commentData] = await Promise.all([
      loadPhotos(userId, { month: selectedMonth.value, tagId: tagFilter }),
      loadComments(userId, { month: selectedMonth.value }),
    ])

    let photoItems = photoData.map(p => ({
      type: 'photo',
      data: p,
      diary_date: p.diary_date,
      time: p.captured_at,
    }))

    // タグなしフィルター
    if (selectedTagId.value === '__none__') {
      photoItems = photoItems.filter(p => !p.data.tag_id)
    }

    const commentItems = commentData.map(c => ({
      type: 'comment',
      data: c,
      diary_date: c.diary_date,
      time: c.commented_at,
    }))

    items.value = [...photoItems, ...commentItems]
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch([selectedMonth, selectedTagId], fetchData)

onMounted(async () => {
  await loadTags(currentUser.value.id)
  await fetchData()
})
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-3">画像一覧</h2>

    <!-- フィルター -->
    <div class="d-flex ga-2 mb-4">
      <v-select
        v-model="selectedMonth"
        :items="monthOptions"
        density="compact"
        hide-details
        label="月"
        style="max-width: 180px"
      />
      <v-select
        v-model="selectedTagId"
        :items="tagOptions"
        density="compact"
        hide-details
        label="タグ"
        style="max-width: 180px"
      />
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

        <!-- グリッド表示 -->
        <div class="image-grid">
          <template v-for="item in group.entries" :key="item.data.id">
            <!-- 写真 -->
            <div v-if="item.type === 'photo'" class="grid-item" @click="expandedPhoto = item.data">
              <v-img
                :src="item.data.publicUrl"
                :aspect-ratio="1"
                cover
                class="rounded"
              />
              <div class="grid-overlay">
                <span class="text-caption">{{ formatTime(item.time) }}</span>
              </div>
            </div>
            <!-- コメント -->
            <div
              v-else
              class="grid-item grid-comment rounded pa-2 d-flex flex-column justify-center"
              @click="expandedComment = item.data"
            >
              <div class="text-caption text-truncate-2">{{ item.data.content }}</div>
              <div class="text-caption text-grey mt-auto">{{ formatTime(item.time) }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 写真拡大ダイアログ -->
    <v-dialog v-model="expandedPhoto" max-width="600" :scrim="true">
      <v-card v-if="expandedPhoto">
        <v-img :src="expandedPhoto.publicUrl" max-height="80vh" contain />
        <v-card-text class="pa-3 d-flex align-center justify-space-between">
          <span class="text-caption text-grey">
            {{ formatTime(expandedPhoto.captured_at) }}
          </span>
          <TagChip :tag="expandedPhoto.tag" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="expandedPhoto = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- コメント全文ダイアログ -->
    <v-dialog v-model="expandedComment" max-width="400">
      <v-card v-if="expandedComment">
        <v-card-text class="pa-4">
          <div class="text-body-1">{{ expandedComment.content }}</div>
          <div class="text-caption text-grey mt-2">
            {{ formatTime(expandedComment.commented_at) }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="expandedComment = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
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
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
