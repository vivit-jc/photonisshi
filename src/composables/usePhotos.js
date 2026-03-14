import { ref } from 'vue'
import { supabase } from '../plugins/supabase'
import { getTodayJST } from '../utils/date'

const photos = ref([])

function mapPhoto(p) {
  return {
    ...p,
    tags: (p.photo_tags || []).map((pt) => pt.tags).filter(Boolean),
    gpsTag: p.gps_tags || null,
    publicUrl: supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl,
  }
}

const SELECT_FIELDS = '*, photo_tags(tags(id, name, type)), gps_tags(id, name)'

export function usePhotos() {
  async function loadTodayPhotos(userId) {
    const { data, error } = await supabase
      .from('photos')
      .select(SELECT_FIELDS)
      .eq('user_id', userId)
      .eq('diary_date', getTodayJST())
      .order('captured_at', { ascending: true })
    if (error) throw error
    photos.value = data.map(mapPhoto)
  }

  async function loadPhotos(userId, { dateFrom, dateTo, tagIds } = {}) {
    let query = supabase
      .from('photos')
      .select(SELECT_FIELDS)
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })

    if (dateFrom) query = query.gte('diary_date', dateFrom)
    if (dateTo) query = query.lte('diary_date', dateTo)

    const { data, error } = await query
    if (error) throw error

    let mapped = data.map(mapPhoto)

    // JS-side tag filter (AND match)
    if (tagIds && tagIds.length > 0) {
      mapped = mapped.filter((p) => {
        const photoTagIds = [
          ...(p.tags || []).map(t => t.id),
          ...(p.gpsTag ? [p.gpsTag.id] : []),
        ]
        return tagIds.every(id => photoTagIds.includes(id))
      })
    }

    return mapped
  }

  async function deletePhoto(photo) {
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([photo.storage_path])
    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photo.id)
    if (dbError) throw dbError
  }

  return { photos, loadTodayPhotos, loadPhotos, deletePhoto }
}
