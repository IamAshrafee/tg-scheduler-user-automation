/**
 * Time formatting utilities for the Telegram Automation Platform.
 *
 * The backend stores all datetimes (next_execution, last_execution, created_at)
 * as naive UTC — no timezone info attached. The frontend must:
 * 1. Treat incoming date strings as UTC
 * 2. Convert to the task's timezone (from schedule.timezone) for display
 * 3. Always use 12-hour format
 */

/**
 * Format a UTC date string in the given timezone with 12-hour format.
 * @param {string} utcDateStr - ISO date string from the backend (UTC)
 * @param {string} timezone - IANA timezone string (e.g., "Asia/Dhaka")
 * @param {object} opts - Additional Intl.DateTimeFormat options to merge
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(utcDateStr, timezone = 'Asia/Dhaka', opts = {}) {
    if (!utcDateStr) return '—';
    try {
        // Ensure the date is treated as UTC
        const date = new Date(utcDateStr.endsWith('Z') ? utcDateStr : utcDateStr + 'Z');
        if (isNaN(date.getTime())) return '—';

        return date.toLocaleString('en-US', {
            timeZone: timezone,
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            ...opts,
        });
    } catch {
        return new Date(utcDateStr).toLocaleString('en-US', { hour12: true, ...opts });
    }
}

/**
 * Format just the time portion (e.g., "2:30 PM").
 */
export function formatTime(utcDateStr, timezone = 'Asia/Dhaka') {
    if (!utcDateStr) return '—';
    try {
        const date = new Date(utcDateStr.endsWith('Z') ? utcDateStr : utcDateStr + 'Z');
        if (isNaN(date.getTime())) return '—';

        return date.toLocaleString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return new Date(utcDateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
}

/**
 * Format a short date+time for log entries (e.g., "Mar 9, 2:30 PM").
 */
export function formatLogTime(utcDateStr, timezone = 'Asia/Dhaka') {
    return formatDateTime(utcDateStr, timezone, {
        year: undefined,
    });
}

/**
 * Get the timezone from a task object, with fallback.
 */
export function getTaskTimezone(task) {
    return task?.schedule?.timezone || 'Asia/Dhaka';
}

/**
 * Convert a 24-hour time string (e.g., "09:00") to 12-hour format (e.g., "9:00 AM").
 */
export function format24to12(time24) {
    if (!time24) return '—';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
