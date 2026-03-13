import { ref, computed } from 'vue'
import { useTags } from './useTags'

export function useTagFilter() {
  const { manualTags, commonTags, loadManualTags, loadCommonTags } = useTags()
  const selectedTagIds = ref([])

  const tagOptions = computed(() => [
    ...commonTags.value.map(t => ({ title: `[共通] ${t.name}`, value: t.id })),
    ...manualTags.value.map(t => ({ title: t.name, value: t.id })),
  ])

  async function loadTags(userId) {
    await Promise.all([loadManualTags(userId), loadCommonTags()])
  }

  function getPhotoTagIds(photo) {
    const ids = (photo.tags || []).map(t => t.id)
    if (photo.gpsTag) ids.push(photo.gpsTag.id)
    return ids
  }

  function matchesTags(photo) {
    if (selectedTagIds.value.length === 0) return true
    const photoTagIds = getPhotoTagIds(photo)
    return selectedTagIds.value.every(id => photoTagIds.includes(id))
  }

  return { selectedTagIds, tagOptions, loadTags, matchesTags }
}
