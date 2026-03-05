<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePhotos } from '../../composables/usePhotos'
import { useComments } from '../../composables/useComments'
import { useMessages } from '../../composables/useMessages'
import TagChip from '../../components/TagChip.vue'

const props = defineProps({
  user: { type: Object, required: true },
})
const emit = defineEmits(['send-message'])

const { loadPhotos } = usePhotos()
const { loadComments } = useComments()
const { loadMessages } = useMessages()

const loading = ref(true)
const items = ref([])
const expandedPhoto = ref(null)

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const timeline = computed(() => {
  return [...items.value].sort((a, b) => new Date(a.time) - new Date(b.time))
})

async function fetchData() {
  loading.value = true
  try {
    const today = getToday()
    const [photoData, commentData, messageData] = await Promise.all([
      loadPhotos(props.user.id, { dateFrom: today, dateTo: today }),
      loadComments(props.user.id, { dateFrom: today, dateTo: today }),
      loadMessages(props.user.id, {
        dateFrom: `${today}T00:00:00`,
        dateTo: `${today}T23:59:59`,
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

watch(() => props.user.id, fetchData)
onMounted(fetchData)

defineExpose({ refresh: fetchData })
</script>

<template>
  <v-card variant="outlined" class="fill-height">
    <v-card-title class="text-body-1 font-weight-bold pa-3 pb-1">
      <v-icon size="small" class="mr-1">mdi-account</v-icon>
      {{ user.username }}
    </v-card-title>

    <v-card-text class="pa-2 overflow-y-auto" style="max-height: 60vh">
      <v-progress-circular v-if="loading" indeterminate color="primary" size="24" class="d-block mx-auto" />

      <div v-else-if="timeline.length === 0" class="text-center text-grey text-caption py-4">
        記録なし
      </div>

      <div v-else class="d-flex flex-column ga-2">
        <template v-for="item in timeline" :key="item.data.id">
          <!-- Photo -->
          <div v-if="item.type === 'photo'" class="timeline-photo" @click="expandedPhoto = item.data">
            <v-img :src="item.data.publicUrl" :aspect-ratio="4/3" cover class="rounded" />
            <div v-if="item.data.caption" class="text-caption mt-1">{{ item.data.caption }}</div>
            <div class="d-flex align-center flex-wrap ga-1 mt-1">
              <span class="text-caption text-grey">{{ formatTime(item.time) }}</span>
              <TagChip v-for="tag in (item.data.tags || [])" :key="tag.id" :tag="tag" />
              <TagChip v-if="item.data.gpsTag" :tag="item.data.gpsTag" type="gps" />
            </div>
          </div>

          <!-- Comment -->
          <v-card v-else-if="item.type === 'comment'" variant="tonal" color="grey" class="rounded-lg">
            <v-card-text class="pa-2">
              <div class="text-body-2" style="white-space: pre-wrap;">{{ item.data.content }}</div>
              <div class="text-caption text-grey mt-1">{{ formatTime(item.time) }}</div>
            </v-card-text>
          </v-card>

          <!-- Message -->
          <v-card v-else-if="item.type === 'message'" variant="tonal" color="blue-lighten-5" class="rounded-lg">
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
}
</style>
