<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useTags } from '../composables/useTags'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  photoIds: { type: Array, default: () => [] },
  commentIds: { type: Array, default: () => [] },
  messageIds: { type: Array, default: () => [] },
  currentTags: { type: Array, default: () => [] },
  userId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'updated'])

const { currentUser } = useAuth()
const { manualTags, commonTags, loadManualTags, loadCommonTags, attachTag, detachTag, attachCommentTag, detachCommentTag, attachMessageTag, detachMessageTag } = useTags()
const loading = ref(false)

const attachedIds = computed(() => new Set(props.currentTags.map((t) => t.id)))

watch(() => props.modelValue, async (open) => {
  if (!open) return
  const uid = props.userId ?? currentUser.value?.id
  if (uid) {
    await Promise.all([
      loadManualTags(uid),
      loadCommonTags(),
    ])
  }
}, { immediate: true })

async function toggle(tagId) {
  if (props.photoIds.length === 0 && props.commentIds.length === 0 && props.messageIds.length === 0) return
  loading.value = true
  try {
    const isAttached = attachedIds.value.has(tagId)
    const photoOps = props.photoIds.map(id =>
      isAttached ? detachTag(id, tagId) : attachTag(id, tagId)
    )
    const commentOps = props.commentIds.map(id =>
      isAttached ? detachCommentTag(id, tagId) : attachCommentTag(id, tagId)
    )
    const messageOps = props.messageIds.map(id =>
      isAttached ? detachMessageTag(id, tagId) : attachMessageTag(id, tagId)
    )
    await Promise.all([...photoOps, ...commentOps, ...messageOps])
    emit('updated')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-body-1 font-weight-bold">タグを選択</v-card-title>
      <v-card-text>
        <div v-if="manualTags.length > 0" class="mb-3">
          <div class="text-caption text-grey mb-1">手動タグ</div>
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="tag in manualTags"
              :key="tag.id"
              :color="attachedIds.has(tag.id) ? 'primary' : undefined"
              :variant="attachedIds.has(tag.id) ? 'flat' : 'outlined'"
              size="small"
              :disabled="loading"
              @click="toggle(tag.id)"
            >
              {{ tag.name }}
            </v-chip>
          </div>
        </div>
        <div v-if="commonTags.length > 0">
          <div class="text-caption text-grey mb-1">共通タグ</div>
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="tag in commonTags"
              :key="tag.id"
              :color="attachedIds.has(tag.id) ? 'teal' : undefined"
              :variant="attachedIds.has(tag.id) ? 'flat' : 'outlined'"
              size="small"
              :disabled="loading"
              @click="toggle(tag.id)"
            >
              {{ tag.name }}
            </v-chip>
          </div>
        </div>
        <div v-if="manualTags.length === 0 && commonTags.length === 0" class="text-center text-grey py-4">
          タグがありません
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
