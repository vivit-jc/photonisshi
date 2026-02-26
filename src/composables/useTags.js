import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const tags = ref([])

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function useTags() {
  async function loadTags(userId) {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    if (error) throw error
    tags.value = data
  }

  async function addTag(userId, name, startTime, endTime) {
    const { error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name,
        start_time: startTime,
        end_time: endTime,
      })
    if (error) throw error
  }

  async function updateTag(tagId, updates) {
    const { error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', tagId)
    if (error) throw error
  }

  async function deleteTag(tagId) {
    // タグ削除前に写真のtag_idをnullに
    await supabase
      .from('photos')
      .update({ tag_id: null })
      .eq('tag_id', tagId)

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
    if (error) throw error
  }

  function findTagForTime(dateTime) {
    const minutes = dateTime.getHours() * 60 + dateTime.getMinutes()
    const matched = tags.value.filter(t => {
      const start = timeToMinutes(t.start_time)
      const end = timeToMinutes(t.end_time)
      return minutes >= start && minutes < end
    })
    if (matched.length === 0) return null
    // 開始時間が早い方優先
    matched.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    return matched[0]
  }

  function detectOverlaps() {
    const overlaps = []
    for (let i = 0; i < tags.value.length; i++) {
      for (let j = i + 1; j < tags.value.length; j++) {
        const a = tags.value[i]
        const b = tags.value[j]
        const aStart = timeToMinutes(a.start_time)
        const aEnd = timeToMinutes(a.end_time)
        const bStart = timeToMinutes(b.start_time)
        const bEnd = timeToMinutes(b.end_time)
        if (aStart < bEnd && bStart < aEnd) {
          overlaps.push([a, b])
        }
      }
    }
    return overlaps
  }

  async function reassignAllTags(userId) {
    await loadTags(userId)
    const { data: allPhotos, error } = await supabase
      .from('photos')
      .select('id, captured_at')
      .eq('user_id', userId)
    if (error) throw error

    for (const photo of allPhotos) {
      const capturedAt = new Date(photo.captured_at)
      const tag = findTagForTime(capturedAt)
      await supabase
        .from('photos')
        .update({ tag_id: tag?.id || null })
        .eq('id', photo.id)
    }
  }

  return {
    tags,
    loadTags,
    addTag,
    updateTag,
    deleteTag,
    findTagForTime,
    detectOverlaps,
    reassignAllTags,
  }
}
