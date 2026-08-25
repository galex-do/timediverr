import { watch, onMounted } from 'vue'

const URL_PARAMS = {
  DATE_FROM: 'from',
  DATE_TO: 'to',
  TAGS: 'tags',
  LAT: 'lat',
  LNG: 'lng',
  ZOOM: 'z'
}

let initialized = false

export function useUrlState(options = {}) {
  const {
    dateFromDisplay,
    dateToDisplay,
    selectedTags,
    updateDateFrom,
    updateDateTo,
    addTag,
    clearTags,
    allTags,
    getMapState,
    setMapState
  } = options

  const parse_url_params = () => {
    const params = new URLSearchParams(window.location.search)
    const state = {}

    if (params.has(URL_PARAMS.DATE_FROM)) {
      state.dateFrom = params.get(URL_PARAMS.DATE_FROM)
    }
    if (params.has(URL_PARAMS.DATE_TO)) {
      state.dateTo = params.get(URL_PARAMS.DATE_TO)
    }
    if (params.has(URL_PARAMS.TAGS)) {
      state.tagIds = params.get(URL_PARAMS.TAGS)
        .split(',')
        .map(raw => {
          const negative = raw.startsWith('-')
          const id = parseInt(negative ? raw.substring(1) : raw, 10)
          return { id, negative }
        })
        .filter(({ id }) => !isNaN(id) && id > 0 && id < 1000000)
    }
    if (params.has(URL_PARAMS.LAT) && params.has(URL_PARAMS.LNG)) {
      const lat = parseFloat(params.get(URL_PARAMS.LAT))
      const lng = parseFloat(params.get(URL_PARAMS.LNG))
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        state.lat = lat
        state.lng = lng
      }
    }
    if (params.has(URL_PARAMS.ZOOM)) {
      const zoom = parseInt(params.get(URL_PARAMS.ZOOM), 10)
      if (!isNaN(zoom) && zoom >= 1 && zoom <= 20) {
        state.zoom = zoom
      }
    }

    return state
  }

  const apply_url_state = (state, availableTags) => {
    if (state.dateFrom && updateDateFrom) {
      updateDateFrom(state.dateFrom)
    }
    if (state.dateTo && updateDateTo) {
      updateDateTo(state.dateTo)
    }
    if (state.tagIds && state.tagIds.length > 0 && availableTags && addTag && clearTags) {
      clearTags()
      state.tagIds.forEach(({ id, negative }) => {
        const tag = availableTags.find(t => t.id === id)
        if (tag) {
          addTag(tag, negative)
        }
      })
    }
    if (state.lat !== undefined && state.lng !== undefined && setMapState) {
      const zoom = state.zoom || 6
      setMapState(state.lat, state.lng, zoom)
    }
  }

  const build_share_url = (mapState = null) => {
    const params = new URLSearchParams()
    
    if (dateFromDisplay?.value) {
      params.set(URL_PARAMS.DATE_FROM, dateFromDisplay.value)
    }
    if (dateToDisplay?.value) {
      params.set(URL_PARAMS.DATE_TO, dateToDisplay.value)
    }
    if (selectedTags?.value && selectedTags.value.length > 0) {
      const tagIds = selectedTags.value.map(t => `${t.negative ? '-' : ''}${t.id}`).join(',')
      params.set(URL_PARAMS.TAGS, tagIds)
    }
    if (mapState) {
      if (mapState.lat !== undefined && mapState.lng !== undefined) {
        params.set(URL_PARAMS.LAT, mapState.lat.toFixed(4))
        params.set(URL_PARAMS.LNG, mapState.lng.toFixed(4))
      }
      if (mapState.zoom !== undefined) {
        params.set(URL_PARAMS.ZOOM, mapState.zoom)
      }
    }

    const baseUrl = window.location.origin + window.location.pathname
    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const update_url_silently = (mapState = null) => {
    const newUrl = build_share_url(mapState)
    window.history.replaceState({}, '', newUrl)
  }

  const copy_share_url = async (mapState = null) => {
    const url = build_share_url(mapState)
    try {
      await navigator.clipboard.writeText(url)
      return { success: true, url }
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err)
      return { success: false, url }
    }
  }

  const has_url_params = () => {
    const params = new URLSearchParams(window.location.search)
    return params.has(URL_PARAMS.DATE_FROM) || 
           params.has(URL_PARAMS.DATE_TO) || 
           params.has(URL_PARAMS.TAGS) ||
           params.has(URL_PARAMS.LAT)
  }

  const initialize_from_url = (availableTags) => {
    if (initialized) return false
    
    if (has_url_params()) {
      const state = parse_url_params()
      apply_url_state(state, availableTags)
      initialized = true
      return true
    }
    initialized = true
    return false
  }

  const setup_url_sync = () => {
    if (dateFromDisplay) {
      watch(dateFromDisplay, () => update_url_silently())
    }
    if (dateToDisplay) {
      watch(dateToDisplay, () => update_url_silently())
    }
    if (selectedTags) {
      watch(selectedTags, () => update_url_silently(), { deep: true })
    }
  }

  return {
    parse_url_params,
    apply_url_state,
    build_share_url,
    update_url_silently,
    copy_share_url,
    has_url_params,
    initialize_from_url,
    setup_url_sync
  }
}
