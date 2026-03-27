const STORAGE_KEY = 'store_sales'

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * localStorage に売上データを保存・取得するcomposable
 *
 * データ構造: { [storeName]: { [date: "YYYY-MM-DD"]: number } }
 */
export function useSales() {
  /** 指定店舗・日付の売上を取得。未入力なら null */
  function getSales(storeName, date) {
    const all = loadAll()
    return all[storeName]?.[date] ?? null
  }

  /** 指定店舗の日付範囲の売上をまとめて取得 { [date]: number | null } */
  function getSalesRange(storeName, dateFrom, dateTo) {
    const all = loadAll()
    const storeData = all[storeName] || {}
    const result = {}
    const current = new Date(dateFrom + 'T00:00:00')
    const end = new Date(dateTo + 'T00:00:00')
    while (current <= end) {
      const key = current.toISOString().slice(0, 10)
      result[key] = storeData[key] ?? null
      current.setDate(current.getDate() + 1)
    }
    return result
  }

  /** 指定店舗・日付範囲に売上データが存在するか */
  function hasExistingData(storeName, dateFrom, dateTo) {
    const range = getSalesRange(storeName, dateFrom, dateTo)
    return Object.values(range).some(v => v !== null)
  }

  /** 指定店舗・開始日から日別売上の配列を保存 */
  function saveSales(storeName, dateFrom, amounts) {
    const all = loadAll()
    if (!all[storeName]) all[storeName] = {}
    const current = new Date(dateFrom + 'T00:00:00')
    for (const amount of amounts) {
      const key = current.toISOString().slice(0, 10)
      all[storeName][key] = amount
      current.setDate(current.getDate() + 1)
    }
    saveAll(all)
  }

  return { getSales, getSalesRange, hasExistingData, saveSales }
}
