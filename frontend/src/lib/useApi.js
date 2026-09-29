import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * Fetch `path` whenever it or `params` change. While a refetch is in flight the
 * previous data stays on screen (callers dim it with `loading`), so charts keep
 * their frame instead of flashing.
 */
export function useApi(path, params) {
  const key = path ? path + JSON.stringify(params || {}) : null
  const [state, setState] = useState({ data: null, error: null, loading: !!path })

  useEffect(() => {
    if (!key) return
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    api(path, { params })
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState((s) => ({ ...s, error, loading: false })))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
