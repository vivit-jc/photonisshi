import { ref } from 'vue'
import { supabase } from '../plugins/supabase'
import { getTodayJST } from '../utils/date'

const comments = ref([])

export function useComments() {
  function mapCommentTags(data) {
    return data.map(c => ({
      ...c,
      tags: (c.comment_tags || []).map(ct => ct.tags).filter(Boolean),
    }))
  }

  async function loadTodayComments(userId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, comment_tags(tags(id, name, type))')
      .eq('user_id', userId)
      .eq('diary_date', getTodayJST())
      .order('commented_at', { ascending: true })
    if (error) throw error
    comments.value = mapCommentTags(data)
  }

  async function loadComments(userId, { dateFrom, dateTo } = {}) {
    let query = supabase
      .from('comments')
      .select('*, comment_tags(tags(id, name, type))')
      .eq('user_id', userId)
      .order('commented_at', { ascending: false })

    if (dateFrom) query = query.gte('diary_date', dateFrom)
    if (dateTo) query = query.lte('diary_date', dateTo)

    const { data, error } = await query
    if (error) throw error
    return mapCommentTags(data)
  }

  async function addComment(userId, content) {
    const now = new Date()
    const { error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        content,
        commented_at: now.toISOString(),
        diary_date: getTodayJST(),
      })
    if (error) throw error
  }

  async function updateComment(commentId, content) {
    const { error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
    if (error) throw error
  }

  async function deleteComment(commentId) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
    if (error) throw error
  }

  return { comments, loadTodayComments, loadComments, addComment, updateComment, deleteComment }
}
