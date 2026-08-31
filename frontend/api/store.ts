/**
 * The Redux store: one object holding all app state.
 *
 * Two "slices" live inside it:
 *   - apiSlice  -> RTK Query cache for simple requests (the /health poll)
 *   - chat      -> messages, status, input (see chat-slice.ts)
 *
 * makeStore() is called once per browser tab (see app/providers.tsx), so
 * each tab gets its own independent chat history.
 */
import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

import { apiSlice } from "./api-slice"
import { chatReducer } from "./chat-slice"

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      chat: chatReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  })

  setupListeners(store.dispatch) // refetchOnFocus / refetchOnReconnect
  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
