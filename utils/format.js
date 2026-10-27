/**
 * 时间与数值格式化
 */
function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/**
 * 相对时间：刚刚 / n 分钟前 / n 小时前 / 昨天 HH:MM / MM-DD HH:MM
 */
function timeAgo(iso) {
  const t = new Date(iso).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  if (diff < 60e3) return '刚刚'
  if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前'
  if (diff < 86400e3) return Math.floor(diff / 3600e3) + ' 小时前'
  const d = new Date(t)
  const now = new Date()
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  const yest = new Date(now.getTime() - 86400e3)
  if (
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate()
  ) {
    return '昨天 ' + hm
  }
  const md = pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  if (d.getFullYear() === now.getFullYear()) return md + ' ' + hm
  return d.getFullYear() + '-' + md + ' ' + hm
}

/**
 * 剩余毫秒 → '45 分钟' / '2 小时' / '1 天 3 小时'
 * 倒计时用 ceil：宁可多报不可少报（floor 会让 2 小时倒计时在第一小时显示"1 小时"）
 */
function remaining(ms) {
  if (ms <= 0) return '已结束'
  const m = Math.ceil(ms / 60e3)
  if (m < 60) return m + ' 分钟'
  const h = Math.ceil(ms / 3600e3)
  if (h < 24) return h + ' 小时'
  const d = Math.floor(h / 24)
  const restH = h - d * 24
  return restH > 0 ? d + ' 天 ' + restH + ' 小时' : d + ' 天'
}

/**
 * 绝对时间：2026-10-13 14:30
 */
function fullTime(iso) {
  const d = new Date(iso)
  if (!d.getTime()) return ''
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  )
}

function pct(part, total) {
  return total <= 0 ? 0 : Math.round((part / total) * 100)
}

/**
 * 金额 → '1,299' / '99.5'（千分位，整数不带小数位）
 */
function money(n) {
  const v = Number(n)
  if (!isFinite(v)) return '0'
  const neg = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  const isFloat = Math.abs(abs % 1) > 0.005
  const s = isFloat ? abs.toFixed(2) : String(Math.round(abs))
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return neg + parts.join('.')
}

module.exports = { timeAgo, remaining, fullTime, pct, pad, money }
