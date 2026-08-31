import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

/**
 * RTK Query handles the simple request/response endpoints.
 * (The SSE chat stream does NOT fit here -- see chat-slice.ts for why.)
 */
export const apiSlice = createApi({
  reducerPath: "api",
  // Relative URL: the request goes to THIS origin, and next.config.ts
  // forwards it to the backend server-side. Same origin -> no CORS, and
  // nothing in the browser can block the backend connection.
  baseQuery: fetchBaseQuery({ baseUrl: "" }),
  endpoints: (builder) => ({
    /** Liveness probe -- powers the online/offline dot in the header. */
    getHealth: builder.query<{ status: string }, void>({
      query: () => "/health",
    }),
  }),
})

export const { useGetHealthQuery } = apiSlice
