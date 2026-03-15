// JST (Asia/Tokyo) 固定で日付を計算するユーティリティ
// ブラウザのタイムゾーン設定に依存しない

// JST での年月日を取得（ブラウザTZ非依存）
function getJSTParts(date = new Date()) {
  const s = date.toLocaleString('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  // "MM/DD/YYYY" 形式
  const [month, day, year] = s.split('/')
  return { year, month, day }
}

// "YYYY-MM-DD" 形式の JST 日付文字列を返す
export function getTodayJST() {
  const { year, month, day } = getJSTParts()
  return `${year}-${month}-${day}`
}

// JST 当日 0:00:00 の UTC ISO 文字列を返す
export function getStartOfDayJST(date = new Date()) {
  const { year, month, day } = getJSTParts(date)
  return new Date(`${year}-${month}-${day}T00:00:00+09:00`).toISOString()
}

// JST 翌日 0:00:00 の UTC ISO 文字列を返す
export function getEndOfDayJST(date = new Date()) {
  const d = new Date(`${getJSTParts(date).year}-${getJSTParts(date).month}-${getJSTParts(date).day}T00:00:00+09:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

export function getDaysAgoJST(days) {
  const now = new Date()
  now.setTime(now.getTime() - days * 24 * 60 * 60 * 1000)
  const { year, month, day } = getJSTParts(now)
  return `${year}-${month}-${day}`
}
