import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const manualTags = ref([])
const commonTags = ref([])

export function useTags() {
  // --- Manual tags (per-user) ---
  async function loadManualTags(userId) {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('type', 'manual')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    if (error) throw error
    manualTags.value = data
  }

  async function addManualTag(userId, name) {
    const { error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name, type: 'manual' })
    if (error) throw error
  }

  async function updateManualTag(tagId, name) {
    const { error } = await supabase
      .from('tags')
      .update({ name })
      .eq('id', tagId)
    if (error) throw error
  }

  async function deleteManualTag(tagId) {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
    if (error) throw error
  }

  // --- Common tags (global, no user_id) ---
  async function loadCommonTags() {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('type', 'common')
      .order('name', { ascending: true })
    if (error) throw error
    commonTags.value = data
  }

  async function addCommonTag(name) {
    const { error } = await supabase
      .from('tags')
      .insert({ name, type: 'common', user_id: null })
    if (error) throw error
  }

  async function updateCommonTag(tagId, name) {
    const { error } = await supabase
      .from('tags')
      .update({ name })
      .eq('id', tagId)
    if (error) throw error
  }

  async function deleteCommonTag(tagId) {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
    if (error) throw error
  }

  // --- Photo-tag operations (photo_tags pivot) ---
  async function attachTag(photoId, tagId) {
    const { error } = await supabase
      .from('photo_tags')
      .insert({ photo_id: photoId, tag_id: tagId })
    if (error) throw error
  }

  async function detachTag(photoId, tagId) {
    const { error } = await supabase
      .from('photo_tags')
      .delete()
      .eq('photo_id', photoId)
      .eq('tag_id', tagId)
    if (error) throw error
  }

  async function getPhotoTags(photoId) {
    const { data, error } = await supabase
      .from('photo_tags')
      .select('tag_id, tags(id, name, type)')
      .eq('photo_id', photoId)
    if (error) throw error
    return data.map((pt) => pt.tags)
  }

  return {
    manualTags,
    commonTags,
    loadManualTags,
    addManualTag,
    updateManualTag,
    deleteManualTag,
    loadCommonTags,
    addCommonTag,
    updateCommonTag,
    deleteCommonTag,
    attachTag,
    detachTag,
    getPhotoTags,
  }
}
