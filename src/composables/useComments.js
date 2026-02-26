import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const comments = ref([])

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useComments() {
  async function loadTodayComments(userId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)
      .eq('diary_date', getToday())
      .order('commented_at', { ascending: true })
    if (error) throw error
    comments.value = data
  }

  async function loadComments(userId, { month } = {}) {
    let query = supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)
      .order('commented_at', { ascending: false })

    if (month) {
      const start = `${month}-01`
      const [y, m] = month.split('-').map(Number)
      const end = new Date(y, m, 0)
      const endStr = `${y}-${String(m).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      query = query.gte('diary_date', start).lte('diary_date', endStr)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async function addComment(userId, content) {
    const now = new Date()
    const { error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        content,
        commented_at: now.toISOString(),
        diary_date: getToday(),
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
