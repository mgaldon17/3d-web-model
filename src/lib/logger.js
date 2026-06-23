// Tiny logger so error output is gated to dev builds instead of shipping raw
// console calls to production. Swap the sink here if a real logging service is
// ever added.
const isDev = Boolean(import.meta.env?.DEV)

export const logger = {
  error: (...args) => {
    if (isDev) console.error(...args)
  },
  warn: (...args) => {
    if (isDev) console.warn(...args)
  },
}
