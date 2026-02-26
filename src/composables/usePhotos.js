import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const photos = ref([])

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function usePhotos() {
  async function loadTodayPhotos(userId) {
    const { data, error } = await supabase
      .from('photos')
      .select('*, tags(name)')
      .eq('user_id', userId)
      .eq('diary_date', getToday())
      .order('captured_at', { ascending: true })
    if (error) throw error
    photos.value = data.map(p => ({
      ...p,
      tag: p.tags || null,
      publicUrl: supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl,
    }))
  }

  async function loadPhotos(userId, { month, tagId } = {}) {
    let query = supabase
      .from('photos')
      .select('*, tags(name)')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })

    if (month) {
      const start = `${month}-01`
      const [y, m] = month.split('-').map(Number)
      const end = new Date(y, m, 0)
      const endStr = `${y}-${String(m).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      query = query.gte('diary_date', start).lte('diary_date', endStr)
    }

    if (tagId) {
      query = query.eq('tag_id', tagId)
    }

    const { data, error } = await query
    if (error) throw error
    return data.map(p => ({
      ...p,
      tag: p.tags || null,
      publicUrl: supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl,
    }))
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
