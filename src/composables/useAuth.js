import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const currentUser = ref(null)
const STORAGE_KEY = 'photonisshi_username'

export function useAuth() {
  function loadSavedUsername() {
    return localStorage.getItem(STORAGE_KEY) || ''
  }

  function saveUsername(username) {
    localStorage.setItem(STORAGE_KEY, username)
  }

  function clearUser() {
    currentUser.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  async function findUser(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()
    if (error) return null
    return data
  }

  async function createUser(username) {
    const { data, error } = await supabase
      .from('users')
      .insert({ username })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function login(username) {
    const user = await findUser(username)
    if (!user) return null
    currentUser.value = user
    saveUsername(username)
    return user
  }

  async function register(username) {
    const existing = await findUser(username)
    if (existing) throw new Error('このユーザー名は既に使われています')
    const user = await createUser(username)
    currentUser.value = user
    saveUsername(username)
    return user
  }

  async function restoreSession() {
    const saved = loadSavedUsername()
    if (!saved) return false
    const user = await findUser(saved)
    if (user) {
      currentUser.value = user
      return true
    }
    localStorage.removeItem(STORAGE_KEY)
    return false
  }

  return {
    currentUser,
    loadSavedUsername,
    login,
    register,
    restoreSession,
    clearUser,
  }
}
