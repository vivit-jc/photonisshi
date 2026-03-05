import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const messages = ref([])

export function useMessages() {
  async function loadMessages(userId, { dateFrom, dateTo } = {}) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })

    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async function loadTodayMessages(userId) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('to_user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })
    if (error) throw error
    messages.value = data
    return data
  }

  async function sendMessage(toUserId, content, messageType = 'text') {
    const { error } = await supabase
      .from('messages')
      .insert({
        to_user_id: toUserId,
        content,
        message_type: messageType,
      })
    if (error) throw error
  }

  async function deleteMessage(id) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  return { messages, loadMessages, loadTodayMessages, sendMessage, deleteMessage }
}
