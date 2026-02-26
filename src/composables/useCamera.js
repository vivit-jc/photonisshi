import { ref } from 'vue'
import { supabase } from '../plugins/supabase'
import { useTags } from './useTags'

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
  const { findTagForTime, loadTags } = useTags()

  function openCamera(userId) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment'

      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          reject(new Error('cancelled'))
          return
        }
        uploading.value = true
        let step = 'compress'
        try {
          const compressed = await compressImage(file)
          step = 'storage-upload'
          const now = new Date()
          const diaryDate = getToday()
          const uuid = crypto.randomUUID()
          const storagePath = `${userId}/${diaryDate}/${uuid}.jpg`

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(storagePath, compressed, { contentType: 'image/jpeg' })
          if (uploadError) throw uploadError

          step = 'tag-lookup'
          await loadTags(userId)
          const tag = findTagForTime(now)

          step = 'db-insert'
          const { error: insertError } = await supabase
            .from('photos')
            .insert({
              user_id: userId,
              storage_path: storagePath,
              captured_at: now.toISOString(),
              diary_date: diaryDate,
              tag_id: tag?.id || null,
            })
          if (insertError) throw insertError

          resolve()
        } catch (e) {
          const detail = `[${step}] ${e.message || e.statusCode || JSON.stringify(e)}`
          const err = new Error(detail)
          err.step = step
          err.original = e
          reject(err)
        } finally {
          uploading.value = false
        }
      }

      input.oncancel = () => reject(new Error('cancelled'))
      input.click()
    })
  }

  return { openCamera, uploading }
}
