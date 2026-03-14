<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePhotos } from '../../composables/usePhotos'
import { useComments } from '../../composables/useComments'
import { useMessages } from '../../composables/useMessages'
import { useTagFilter } from '../../composables/useTagFilter'
import { getTodayJST } from '../../utils/date'
import TagChip from '../../components/TagChip.vue'
import TagFilterSelect from '../../components/TagFilterSelect.vue'

const props = defineProps({
  user: { type: Object, required: true },
})
const emit = defineEmits(['send-message'])

const { loadPhotos } = usePhotos()
const { loadComments } = useComments()
const { loadMessages } = useMessages()
const { selectedTagIds, tagOptions, loadTags } = useTagFilter()

const loading = ref(true)
const items = ref([])
const expandedPhoto = ref(null)
const showFilter = ref(false)

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
    const fromDate = new Date(from + 'T00:00:00')
    const toDate = new Date(to + 'T00:00:00')
    toDate.setDate(toDate.getDate() + 1)
    const [photoData, commentData, messageData] = await Promise.all([
      loadPhotos(props.user.id, {
        dateFrom: from,
        dateTo: to,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
      }),
      loadComments(props.user.id, { dateFrom: from, dateTo: to }),
      loadMessages(props.user.id, {
        dateFrom: fromDate.toISOString(),
        dateTo: toDate.toISOString(),
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

defineExpose({ refresh: fetchData })
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
              <div class="text-caption text-grey mt-1">{{ formatTime(item.time) }}</div>
            </v-card-text>
          </v-card>
          <v-card v-if="item.type === 'message'" variant="tonal" color="green" class="rounded-lg">
            <v-card-text class="pa-2">
              <div v-if="item.data.message_type === 'stamp'" class="text-h5">{{ item.data.content }}</div>
              <div v-else class="text-body-2" style="white-space: pre-wrap;">{{ item.data.content }}</div>
              <div class="text-caption text-grey mt-1">
                <v-icon size="x-small" class="mr-1">mdi-message-text</v-icon>
                {{ formatTime(item.time) }}
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
          <v-spacer />
          <v-btn variant="text" @click="expandedPhoto = null">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.timeline-photo {
  cursor: pointer;
  width: 50%;
}
</style>
