// JST (Asia/Tokyo) 固定で日付を計算するユーティリティ
// ブラウザのタイムゾーン設定に依存しない

function toJSTDate(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
}

export function getTodayJST() {
  const d = toJSTDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getStartOfDayJST(date = new Date()) {
  const d = toJSTDate(date)
  d.setHours(0, 0, 0, 0)
  // JST は UTC+9 なので、JSTの0時 = UTC前日15時
  const utc = new Date(d.getTime() - 9 * 60 * 60 * 1000)
  return utc.toISOString()
}

export function getEndOfDayJST(date = new Date()) {
  const d = toJSTDate(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 1)
  const utc = new Date(d.getTime() - 9 * 60 * 60 * 1000)
  return utc.toISOString()
}

export function getDaysAgoJST(days) {
  const d = toJSTDate()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
