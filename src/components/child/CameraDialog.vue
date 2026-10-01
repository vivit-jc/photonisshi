<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

// アプリ内でカメラ映像を表示して撮影する（getUserMedia）
// アプリ内ブラウザでは file input の capture 属性が無視されギャラリーが開くことがあるため
// カメラを使えないときは fallback を emit し、端末のカメラアプリでの撮影に切り替えてもらう
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'captured', 'fallback'])

const video = ref(null)
const facingMode = ref('environment')
const starting = ref(false)
const errorMsg = ref('')
let stream = null

function stopStream() {
  stream?.getTracks().forEach(t => t.stop())
  stream = null
}

async function startStream() {
  stopStream()
  errorMsg.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    errorMsg.value = 'このブラウザではカメラを直接使えません'
    return
  }
  starting.value = true
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode.value },
        width: { ideal: 1920 },
        height: { ideal: 1920 },
      },
      audio: false,
    })
    // 起動中にダイアログが閉じられた場合
    if (!props.modelValue) {
      stopStream()
      return
    }
    await nextTick()
    video.value.srcObject = stream
    await video.value.play()
  } catch (e) {
    stopStream()
    errorMsg.value = e.name === 'NotAllowedError'
      ? 'カメラの使用が許可されていません'
      : `カメラを起動できませんでした（${e.name || e.message}）`
  } finally {
    starting.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    startStream()
  } else {
    stopStream()
  }
})

onBeforeUnmount(stopStream)

function close() {
  emit('update:modelValue', false)
}

function switchCamera() {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  startStream()
}

function shoot() {
  const v = video.value
  if (!stream || !v.videoWidth) return
  const canvas = document.createElement('canvas')
  canvas.width = v.videoWidth
  canvas.height = v.videoHeight
  canvas.getContext('2d').drawImage(v, 0, 0)
  canvas.toBlob((blob) => {
    if (!blob) return
    close()
    emit('captured', blob)
  }, 'image/jpeg', 0.92)
}

// ユーザー操作の中で file input を開く必要があるため、ボタンから呼ぶ
function useFallback() {
  close()
  emit('fallback')
}
</script>

<template>
  <v-dialog :model-value="modelValue" fullscreen persistent>
    <v-card color="black" class="d-flex flex-column">
      <div class="flex-grow-1 d-flex align-center justify-center position-relative overflow-hidden">
        <video
          v-show="!errorMsg"
          ref="video"
          class="camera-video"
          autoplay
          muted
          playsinline
        />
        <v-progress-circular
          v-if="starting"
          indeterminate
          color="white"
          size="48"
          class="position-absolute"
        />
        <div v-if="errorMsg" class="text-center text-white pa-6">
          <v-icon icon="mdi-camera-off" size="48" class="mb-4" />
          <div class="mb-6">{{ errorMsg }}</div>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-camera" @click="useFallback">
            端末のカメラで撮影
          </v-btn>
        </div>
      </div>
      <div class="d-flex align-center justify-space-between pa-4">
        <v-btn variant="text" color="white" @click="close">キャンセル</v-btn>
        <v-btn
          icon="mdi-camera"
          color="white"
          size="x-large"
          :disabled="starting || !!errorMsg"
          @click="shoot"
        />
        <v-btn
          icon="mdi-camera-flip"
          variant="text"
          color="white"
          :disabled="starting || !!errorMsg"
          @click="switchCamera"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.camera-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
