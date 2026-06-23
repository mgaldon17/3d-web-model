import { createContext, useContext } from 'react'
import { scrollStore } from './scrollStore.js'

// Lets components depend on an abstract scroll source ({ getProgress, subscribe })
// instead of importing a concrete singleton. Defaults to the app's scrollStore so
// nothing breaks without an explicit provider, but a different source can be
// injected (e.g. in tests or an alternate page).
const ScrollContext = createContext(scrollStore)

export const ScrollProvider = ScrollContext.Provider

export function useScroll() {
  return useContext(ScrollContext)
}
