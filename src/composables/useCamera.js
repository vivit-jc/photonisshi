import { ref } from 'vue'
import { supabase } from '../plugins/supabase'
import { useGeolocation } from './useGeolocation'
import { useGpsTags } from './useGpsTags'

const uploading = ref(false)

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function compressImage(file, maxSide = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSide || height > maxSide) {
        if (width > height) {
          height = Math.round(height * (maxSide / width))
          width = maxSide
        } else {
          width = Math.round(width * (maxSide / height))
          height = maxSide
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('圧縮に失敗'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('画像の読み込みに失敗'))
    img.src = url
  })
}

export function useCamera() {
  const { getCoords } = useGeolocation()
  const { loadGpsTags, findNearestGpsTag } = useGpsTags()

  // Pick file(s), compress, and get GPS
  // useCapture=true: camera (single), useCapture=false: gallery (multiple)
  function pickAndCompress(useCapture = true) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      if (useCapture) {
        input.capture = 'environment'
      } else {
        input.multiple = true
      }

      input.onchange = async () => {
        const files = Array.from(input.files || [])
        if (files.length === 0) {
          reject(new Error('cancelled'))
          return
        }
        try {
          const [blobs, position] = await Promise.all([
            Promise.all(files.map(f => compressImage(f))),
            getCoords(10000),
          ])
          resolve({ blobs, position })
        } catch (e) {
          reject(e)
        }
      }

      input.oncancel = () => reject(new Error('cancelled'))
      input.click()
    })
  }

  // Step 2: Upload photo with caption and GPS tag
  async function uploadPhoto(userId, blob, caption = null, position = null) {
    uploading.value = true
    let step = 'storage-upload'
    try {
      const now = new Date()
      const diaryDate = getToday()
      const uuid = crypto.randomUUID()
      const storagePath = `${userId}/${diaryDate}/${uuid}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      step = 'gps-tag-lookup'
      let gpsTagId = null
      if (position) {
        await loadGpsTags()
        const result = findNearestGpsTag(position.latitude, position.longitude)
        if (result) gpsTagId = result.tag.id
      }

      step = 'db-insert'
      const { data, error: insertError } = await supabase
        .from('photos')
        .insert({
          user_id: userId,
          storage_path: storagePath,
          captured_at: now.toISOString(),
          diary_date: diaryDate,
          caption: caption || null,
          gps_tag_id: gpsTagId,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      return data.id
    } catch (e) {
      const detail = `[${step}] ${e.message || e.statusCode || JSON.stringify(e)}`
      const err = new Error(detail)
      err.step = step
      err.original = e
      throw err
    } finally {
      uploading.value = false
    }
  }

  return { pickAndCompress, uploadPhoto, uploading }
}
