import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * Fetch `path` whenever it or `params` change. While a refetch is in flight the
 * previous data stays on screen (callers dim it with `loading`), so charts keep
 * their frame instead of flashing.
 *
 * With `refreshMs`, the data is also refetched quietly on that interval (no
 * `loading` flag) while the tab is visible.
 */
export function useApi(path, params, { refreshMs } = {}) {
  const key = path ? path + JSON.stringify(params || {}) : null
  const [state, setState] = useState({ data: null, error: null, loading: !!path })

  useEffect(() => {
    if (!key) return
    let cancelled = false
    let busy = false
    const load = () => {
      busy = true
      api(path, { params })
        .then((data) => !cancelled && setState({ data, error: null, loading: false }))
        .catch((error) => !cancelled && setState((s) => ({ ...s, error, loading: false })))
        .finally(() => { busy = false })
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    load()
    const timer = refreshMs && setInterval(() => !busy && !document.hidden && load(), refreshMs)
    return () => { cancelled = true; clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshMs])

  return state
}
