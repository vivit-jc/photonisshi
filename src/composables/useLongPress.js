import { ref, onUnmounted } from 'vue'

export function useLongPress(callback, { duration = 700 } = {}) {
  const isPressed = ref(false)
  let timer = null
  let moved = false

  function start(e) {
    moved = false
    isPressed.value = true
    timer = setTimeout(() => {
      if (!moved) {
        callback(e)
      }
      isPressed.value = false
    }, duration)
  }

  function move() {
    moved = true
    cancel()
  }

  function cancel() {
    clearTimeout(timer)
    timer = null
    isPressed.value = false
  }

  onUnmounted(() => {
    clearTimeout(timer)
  })

  const handlers = {
    onTouchstart: start,
    onTouchmove: move,
    onTouchend: cancel,
    onTouchcancel: cancel,
    onMousedown: start,
    onMousemove: move,
    onMouseup: cancel,
    onMouseleave: cancel,
  }

  return { handlers, isPressed }
}
