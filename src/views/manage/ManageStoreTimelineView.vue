<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../../plugins/supabase'
import { getTodayJST, getDaysAgoJST } from '../../utils/date'
import { STORE_NAMES } from '../../constants/stores'
import { useSales } from '../../composables/useSales'
import TagChip from '../../components/TagChip.vue'

const { getSalesRange } = useSales()

const selectedStore = ref('')
const loading = ref(false)
const photos = ref([])
const expandedPhoto = ref(null)

const dateFrom = ref(getDaysAgoJST(6))
const dateTo = ref(getTodayJST())

const SELECT_FIELDS = '*, photo_tags(tags(id, name, type)), gps_tags(id, name), users(username)'

function mapPhoto(p) {
  return {
    ...p,
    tags: (p.photo_tags || []).map((pt) => pt.tags).filter(Boolean),
    gpsTag: p.gps_tags || null,
    username: p.users?.username || '',
    publicUrl: supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl,
  }
}

const salesMap = computed(() => {
  if (!selectedStore.value || !dateFrom.value || !dateTo.value) return {}
  return getSalesRange(selectedStore.value, dateFrom.value, dateTo.value)
})

const groupedByDate = computed(() => {
  // 写真がある日付を集める
  const groups = {}
  for (const photo of photos.value) {
    const date = photo.diary_date
    if (!groups[date]) groups[date] = []
    groups[date].push(photo)
  }
  // 売上のみ存在する日付も含める
  for (const [date, amount] of Object.entries(salesMap.value)) {
    if (!groups[date]) groups[date] = []
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({
      date,
      label: formatDate(date),
      sales: salesMap.value[date] ?? null,
      entries: entries.sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at)),
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

async function fetchPhotos() {
  if (!selectedStore.value) {
    photos.value = []
    return
  }
  loading.value = true
  try {
    let query = supabase
      .from('photos')
      .select(SELECT_FIELDS)
      .order('captured_at', { ascending: false })

    if (dateFrom.value) query = query.gte('diary_date', dateFrom.value)
    if (dateTo.value) query = query.lte('diary_date', dateTo.value)

    const { data, error } = await query
    if (error) throw error

    const mapped = data.map(mapPhoto)

    // タグ名が選択した店舗名と一致する写真を絞り込む
    photos.value = mapped.filter((p) => {
      const tagNames = [
        ...(p.tags || []).map(t => t.name),
        ...(p.gpsTag ? [p.gpsTag.name] : []),
      ]
      return tagNames.includes(selectedStore.value)
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch([selectedStore, dateFrom, dateTo], fetchPhotos)

onMounted(() => {
  if (selectedStore.value) fetchPhotos()
})
</script>

<template>
  <div class="timeline-bg">
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-3">店舗タイムライン</h2>

    <!-- 店舗選択 -->
    <v-select
      v-model="selectedStore"
      :items="STORE_NAMES"
      label="店舗を選択"
      density="compact"
      hide-details
      clearable
      class="mb-3"
    />

    <!-- 日付フィルター -->
    <div class="d-flex ga-2 mb-4">
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

    <div v-if="!selectedStore" class="text-center text-grey py-8">
      店舗を選択してください
    </div>

    <v-progress-circular v-else-if="loading" indeterminate color="teal" class="d-block mx-auto" />

    <div v-else-if="groupedByDate.length === 0" class="text-center text-grey py-8">
      写真がありません
    </div>

    <div v-else class="d-flex flex-column ga-4">
      <div v-for="group in groupedByDate" :key="group.date">
        <div class="text-body-2 font-weight-bold mb-2 text-grey-darken-1">
          {{ group.label }}
        </div>

        <!-- 売上カード -->
        <v-card
          v-if="group.sales !== null"
          density="compact"
          variant="tonal"
          color="amber"
          class="mb-2 pa-2"
        >
          <div class="d-flex align-center">
            <v-icon size="small" class="mr-1">mdi-cash-register</v-icon>
            <span class="text-body-2 font-weight-medium">
              売上: ¥{{ group.sales.toLocaleString() }}
            </span>
          </div>
        </v-card>
        <div class="image-grid">
          <div
            v-for="photo in group.entries"
            :key="photo.id"
            class="grid-item"
            @click="expandedPhoto = photo"
          >
            <v-img :src="photo.publicUrl" :aspect-ratio="1" cover class="rounded" />
            <div class="grid-overlay">
              <span class="text-caption">{{ photo.username }}</span>
              <span class="text-caption ml-1">{{ formatTime(photo.captured_at) }}</span>
            </div>
          </div>
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
          <v-chip size="x-small" color="grey" variant="outlined" class="mr-1">
            {{ expandedPhoto.username }}
          </v-chip>
          <span class="text-caption text-grey mr-2">
            {{ formatTime(expandedPhoto.captured_at) }}
          </span>
          <TagChip v-for="tag in (expandedPhoto.tags || [])" :key="tag.id" :tag="tag" />
          <TagChip v-if="expandedPhoto.gpsTag" :tag="expandedPhoto.gpsTag" type="gps" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="expandedPhoto = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
</style>
