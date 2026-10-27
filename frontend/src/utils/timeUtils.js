/**
 * Timezone Utility for Incident Loop
 * Standardizes timestamp display to Indian Standard Time (Asia/Kolkata, UTC+05:30)
 * Uses standard Intl.DateTimeFormat without manual hour-adding arithmetic.
 * Timestamps in storage remain strictly in UTC.
 */

const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Validates and converts input into a valid Date object.
 * Returns null if invalid or missing.
 */
export function parseDate(dateInput) {
  if (!dateInput) return null
  const d = new Date(dateInput)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formats a UTC date or ISO string into a standard IST Date & Time string.
 * Example output: "27 Oct 2026, 10:23 pm IST"
 */
export function formatDateTimeIST(dateInput, includeSeconds = false) {
  const date = parseDate(dateInput)
  if (!date) return '—'

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true,
    })

    return `${formatter.format(date)} IST`
  } catch (err) {
    console.warn('formatDateTimeIST error:', err)
    return date.toISOString()
  }
}

/**
 * Formats a date into compact IST time only.
 * Example output: "10:23 pm IST"
 */
export function formatTimeOnlyIST(dateInput, includeSeconds = false) {
  const date = parseDate(dateInput)
  if (!date) return '—'

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true,
    })

    return `${formatter.format(date)} IST`
  } catch (err) {
    return date.toTimeString()
  }
}

/**
 * Formats a date into IST Date only.
 * Example output: "27 Oct 2026"
 */
export function formatDateOnlyIST(dateInput) {
  const date = parseDate(dateInput)
  if (!date) return '—'

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    return formatter.format(date)
  } catch (err) {
    return date.toDateString()
  }
}

/**
 * Returns the current time formatted for the live telemetry clock in IST.
 * Example: "22:23:05 IST" or "10:23:05 PM IST"
 */
export function getLiveTelemetryClockIST() {
  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    return `${formatter.format(new Date())} IST`
  } catch {
    return new Date().toISOString()
  }
}
