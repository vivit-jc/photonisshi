export function useGeolocation() {
  function getCurrentPosition(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation API非対応'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 60000,
      })
    })
  }

  async function getCoords(timeout = 10000) {
    try {
      const pos = await getCurrentPosition(timeout)
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }
    } catch {
      return null
    }
  }

  return { getCurrentPosition, getCoords }
}
