import { ref } from 'vue'
import { supabase } from '../plugins/supabase'
import { getStartOfDayJST, getEndOfDayJST } from '../utils/date'

const messages = ref([])

export function useMessages() {
  function mapMessageTags(data) {
    return data.map(m => ({
      ...m,
      tags: (m.message_tags || []).map(mt => mt.tags).filter(Boolean),
    }))
  }

  async function loadMessages(userId, { dateFrom, dateTo } = {}) {
    let query = supabase
      .from('messages')
      .select('*, message_tags(tags(id, name, type))')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })

    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lt('created_at', dateTo)

    const { data, error } = await query
    if (error) throw error
    return mapMessageTags(data)
  }

  async function loadTodayMessages(userId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, message_tags(tags(id, name, type))')
      .eq('to_user_id', userId)
      .gte('created_at', getStartOfDayJST())
      .lt('created_at', getEndOfDayJST())
      .order('created_at', { ascending: true })
    if (error) throw error
    messages.value = mapMessageTags(data)
    return messages.value
  }

  async function sendMessage(toUserId, content, messageType = 'text') {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        to_user_id: toUserId,
        content,
        message_type: messageType,
      })
      .select('id')
      .single()
    if (error) throw error
    return data
  }

  async function updateMessage(id, content) {
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', id)
    if (error) throw error
  }

  async function deleteMessage(id) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  return { messages, loadMessages, loadTodayMessages, sendMessage, updateMessage, deleteMessage }
}
