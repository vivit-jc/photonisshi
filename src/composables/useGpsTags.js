import { ref } from 'vue'
import { supabase } from '../plugins/supabase'

const gpsTags = ref([])

const RADIUS_THRESHOLD = 300 // meters

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useGpsTags() {
  async function loadGpsTags() {
    const { data, error } = await supabase
      .from('gps_tags')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    gpsTags.value = data
  }

  async function addGpsTag(name, latitude, longitude) {
    const { error } = await supabase
      .from('gps_tags')
      .insert({ name, latitude, longitude })
    if (error) throw error
  }

  async function updateGpsTag(id, updates) {
    const { error } = await supabase
      .from('gps_tags')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  }

  async function deleteGpsTag(id) {
    const { error } = await supabase
      .from('gps_tags')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  function findNearestGpsTag(latitude, longitude) {
    let nearest = null
    let minDist = Infinity
    for (const tag of gpsTags.value) {
      const dist = haversineDistance(latitude, longitude, tag.latitude, tag.longitude)
      if (dist < minDist) {
        minDist = dist
        nearest = tag
      }
    }
    if (nearest && minDist <= RADIUS_THRESHOLD) {
      return { tag: nearest, distance: minDist }
    }
    return null
  }

  return { gpsTags, loadGpsTags, addGpsTag, updateGpsTag, deleteGpsTag, findNearestGpsTag }
}
