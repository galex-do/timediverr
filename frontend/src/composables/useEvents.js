import { ref, computed, watch } from 'vue'
import apiService from '@/services/api.js'
import { parseHistoricalDate } from '@/utils/date-utils.js'
import { getEraFromDate } from '@/utils/date-utils.js'
import { useLocale } from '@/composables/useLocale.js'
import { useTags } from '@/composables/useTags.js'

// Shared state - singleton pattern
const events = ref([])
const filteredEvents = ref([])
const loading = ref(false)
const error = ref(null)
const eventsLoaded = ref(false)

// Tracks which event IDs already have full details (description/source)
// loaded, so ensureEventDetails() never re-fetches the same event twice in a
// session. Cleared whenever the base event list is reloaded (new object
// instances). Not reactive on purpose — it's an internal bookkeeping set,
// not something any template reads directly.
const detailsLoadedIds = new Set()
// In-flight batch fetches keyed by event ID, so concurrent callers asking
// about overlapping IDs (e.g. a grid page and a timeline expansion firing at
// once) share a single network request instead of racing duplicate ones.
const detailsFetchInFlight = new Map()
// Tracks which event IDs have had their bilingual name_en/name_ru/
// description_en/description_ru fields loaded (as opposed to just the
// current locale's name/description, which is all detailsLoadedIds
// guarantees). Kept separate because most callers only ever need the
// current locale -- only the map's edit-event flow needs every locale, and
// it may run after a display call already populated the locale-only fields.
const translationsLoadedIds = new Set()

// In-flight fetchEvents() calls keyed by request shape (lean vs. full), at
// module scope so it's shared across every component that calls useEvents()
// — not just within one call. Every consumer registers its own reaction to
// locale changes, so a single locale switch can trigger several concurrent
// fetchEvents() calls; without this, each one reassigns `events.value` to a
// brand new array of new object instances, and whichever resolves last
// "wins" — silently orphaning anything derived from an earlier one (like
// MapView's filteredEvents, reapplied right after its own fetchEvents()
// resolves). That desync is what made descriptions/names appear stuck after
// a locale switch until a full reload.
const fetchEventsInFlight = new Map()

export function useEvents() {
  const { locale } = useLocale()
  const { allTags, loadTags, getTagsByIds } = useTags()

  // Watch locale changes and re-fetch events
  watch(locale, async () => {
    console.log('Locale changed, re-fetching events')
    await fetchEvents()
  })

  // Fetch all events from API.
  // Pass { includeDescriptions: true } (used by the admin table) to get full
  // descriptions/source embedded inline; otherwise events arrive lean and
  // descriptions are fetched on demand via ensureEventDetails().
  // Coalesces concurrent calls of the same shape via the module-level
  // fetchEventsInFlight map (see comment above it).
  const fetchEvents = async (options = {}) => {
    const { includeDescriptions = false } = options
    const flightKey = includeDescriptions ? 'full' : 'lean'
    if (fetchEventsInFlight.has(flightKey)) {
      return fetchEventsInFlight.get(flightKey)
    }

    const promise = doFetchEvents(includeDescriptions).finally(() => {
      fetchEventsInFlight.delete(flightKey)
    })
    fetchEventsInFlight.set(flightKey, promise)
    return promise
  }

  const doFetchEvents = async (includeDescriptions) => {
    loading.value = true
    error.value = null
    detailsLoadedIds.clear()
    detailsFetchInFlight.clear()
    translationsLoadedIds.clear()

    try {
      const eventData = await apiService.getEvents(null, null, null, null, includeDescriptions)
      const rawEvents = Array.isArray(eventData) ? eventData : []

      // The bulk list only ships tag IDs — resolve them into the full tag
      // objects (name/color/description) every component already expects,
      // using the small, separately-cached tag catalog. This is the one
      // place that needs to change so no other component's template has to.
      if (allTags.value.length === 0) {
        await loadTags()
      }
      events.value = rawEvents.map(e => ({
        ...e,
        tags: Array.isArray(e.tag_ids) ? getTagsByIds(e.tag_ids) : (e.tags || [])
      }))

      if (includeDescriptions) {
        events.value.forEach(e => detailsLoadedIds.add(e.id))
      }

      eventsLoaded.value = true
      // Don't automatically set filteredEvents - let filtering be applied explicitly
      console.log('Successfully loaded events:', events.value.length)
    } catch (err) {
      console.error('Error fetching events:', err)
      error.value = err.message || 'Failed to fetch events'
      events.value = []
      filteredEvents.value = []
    } finally {
      loading.value = false
    }
  }

  // Must match the backend's maxBatchEventIDs cap (backend/internal/handlers/
  // event_handler.go) — the server silently truncates any single request
  // beyond this, so the client chunks into requests of this size instead of
  // ever relying on that truncation.
  const BATCH_DETAIL_CHUNK_SIZE = 200

  // Ensure the given event IDs have full details (description/source, plus
  // the current locale's name) loaded, fetching only what's missing via the
  // batch endpoint and mutating the shared event objects in place. Because
  // `events`/`filteredEvents` hold the same object references everywhere
  // they're consumed (map, grid, timeline, admin), this makes the fetched
  // fields reactively appear wherever that event is rendered, and never
  // fetches the same event twice in a session. Requests are chunked to the
  // server's batch size limit so large visible sets (e.g. an expanded
  // timeline) don't silently lose details past that limit.
  //
  // Pass { includeTranslations: true } (used by the map's edit-event flow to
  // prefill a bilingual form) to also fetch every other locale's name_en/
  // name_ru/description_en/description_ru. This is tracked separately from
  // detailsLoadedIds: a plain display call may have already loaded the
  // locale-only fields for an ID, so a later translations request for that
  // same ID still needs to go back to the server rather than being treated
  // as a cache hit.
  const ensureEventDetails = async (ids, { includeTranslations = false } = {}) => {
    const uniqueIds = [...new Set((ids || []).filter(id => id != null))]
    const missing = uniqueIds.filter(id => (
      !detailsLoadedIds.has(id) || (includeTranslations && !translationsLoadedIds.has(id))
    ))
    if (missing.length === 0) return

    const toFetch = missing.filter(id => !detailsFetchInFlight.has(id))
    if (toFetch.length > 0) {
      const chunks = []
      for (let i = 0; i < toFetch.length; i += BATCH_DETAIL_CHUNK_SIZE) {
        chunks.push(toFetch.slice(i, i + BATCH_DETAIL_CHUNK_SIZE))
      }

      const chunkPromises = chunks.map(chunk =>
        apiService.getEventsBatch(chunk, { includeTranslations }).then(details => {
          const byId = new Map(events.value.map(e => [e.id, e]))
          for (const full of (details || [])) {
            const target = byId.get(full.id)
            if (target) {
              target.description = full.description
              target.source = full.source
              if (includeTranslations) {
                target.name_en = full.name_en
                target.name_ru = full.name_ru
                target.description_en = full.description_en
                target.description_ru = full.description_ru
              }
            }
            detailsLoadedIds.add(full.id)
            if (includeTranslations) translationsLoadedIds.add(full.id)
          }
        }).catch(err => {
          console.error('Failed to fetch event details batch:', err)
        }).finally(() => {
          chunk.forEach(id => detailsFetchInFlight.delete(id))
        })
      )

      chunks.forEach((chunk, i) => {
        chunk.forEach(id => detailsFetchInFlight.set(id, chunkPromises[i]))
      })
    }

    await Promise.all(missing.map(id => detailsFetchInFlight.get(id)).filter(Boolean))
  }

  // Filter events based on date range, lens types, and tags
  const filterEvents = (dateFrom, dateTo, selectedLensTypes, selectedTemplate, dateFromDisplay, dateToDisplay, selectedTags = []) => {
    // Ensure events is an array before filtering
    if (!Array.isArray(events.value)) {
      console.warn('Events is not an array:', events.value)
      events.value = []
    }
    
    // Parse date string + era into a single integer for cheap comparison and sorting.
    // BC dates are negative; within BC, earlier months in the year sort first.
    const to_chronological = (event_date, era) => {
      let year, month, day
      if (event_date.startsWith('-')) {
        const raw = event_date.substring(1)
        const t = raw.indexOf('T')
        const ymd = (t === -1 ? raw : raw.substring(0, t)).split('-')
        year = parseInt(ymd[0], 10)
        month = parseInt(ymd[1], 10)
        day = parseInt(ymd[2], 10)
      } else {
        const t = event_date.indexOf('T')
        const ymd = (t === -1 ? event_date : event_date.substring(0, t)).split('-')
        year = parseInt(ymd[0], 10)
        month = parseInt(ymd[1], 10)
        day = parseInt(ymd[2], 10)
      }
      const m = month || 1
      const d = day || 1
      if (era === 'BC') {
        return -(year * 10000 + (13 - m) * 100 + (32 - d))
      }
      return year * 10000 + m * 100 + d
    }

    const fromDate = parseHistoricalDate(dateFromDisplay)
    const toDate = parseHistoricalDate(dateToDisplay)
    const fromVal = fromDate ? to_chronological(
      `${fromDate.era === 'BC' ? '-' : ''}${String(fromDate.year).padStart(4,'0')}-${String(fromDate.month||1).padStart(2,'0')}-${String(fromDate.day||1).padStart(2,'0')}`,
      fromDate.era
    ) : null
    const toVal = toDate ? to_chronological(
      `${toDate.era === 'BC' ? '-' : ''}${String(toDate.year).padStart(4,'0')}-${String(toDate.month||1).padStart(2,'0')}-${String(toDate.day||1).padStart(2,'0')}`,
      toDate.era
    ) : null

    // Single pass: compute chronological key once per event, filter, keep key for sort
    const hasLensFilter = selectedLensTypes.length > 0
    const hasTagFilter  = selectedTags.length > 0

    const scored = []
    for (const event of events.value) {
      const eventVal = to_chronological(event.event_date, event.era)
      if (fromVal !== null && eventVal < fromVal) continue
      if (toVal   !== null && eventVal > toVal)   continue
      if (hasLensFilter && !selectedLensTypes.includes(event.lens_type)) continue
      if (hasTagFilter) {
        const eventTags = event.tags || []
        let ok = true
        for (const sel of selectedTags) {
          if (!eventTags.some(t => t.id === sel.id)) { ok = false; break }
        }
        if (!ok) continue
      }
      scored.push({ event, val: eventVal })
    }

    // Sort on the pre-computed integer — no re-parsing
    scored.sort((a, b) => a.val - b.val)

    let tempFilteredEvents = scored.map(s => s.event)
    
    filteredEvents.value = tempFilteredEvents
    
    const lensFilterText = selectedLensTypes.length === 4 ? 'all types' : selectedLensTypes.join(', ')
    console.log(`Filtering events from ${dateFrom} to ${dateTo} for lens types: ${lensFilterText}. Found ${filteredEvents.value.length} events.`)
  }

  // Handle event creation
  const handleEventCreated = async (newEvent) => {
    // Add the new event to the events array.
    // Reassign with a new array (rather than push()) so consumers watching
    // these refs by reference (e.g. WorldMap's shallow `events` watcher)
    // reliably see the change without needing a deep watch.
    if (newEvent && newEvent.id) {
      events.value = [...events.value, newEvent]
      // Also add to filtered events so it's immediately visible on the map
      filteredEvents.value = [...filteredEvents.value, newEvent]
      // The create endpoint already returns full details — no need to
      // re-fetch them via ensureEventDetails later.
      detailsLoadedIds.add(newEvent.id)
      console.log('New event added to arrays:', newEvent.name)
    } else {
      // Fallback: refresh all events if no event data provided
      await fetchEvents()
      console.log('Events list refreshed after new event creation')
    }
  }

  // Handle event update (preserves current filter state)
  const handleEventUpdated = async (updatedEvent) => {
    // Update the event in the current events array.
    // Use .map() to produce a new array reference instead of mutating the
    // existing one in place, for the same shallow-watch reason as above.
    const eventIndex = events.value.findIndex(e => e.id === updatedEvent.id)
    if (eventIndex !== -1) {
      events.value = events.value.map(e => e.id === updatedEvent.id ? updatedEvent : e)
      // The update endpoint already returns full details.
      detailsLoadedIds.add(updatedEvent.id)
      console.log('Event updated in place:', updatedEvent.name)
      
      // Update filtered events array if this event is currently visible
      const filteredIndex = filteredEvents.value.findIndex(e => e.id === updatedEvent.id)
      if (filteredIndex !== -1) {
        filteredEvents.value = filteredEvents.value.map(e => e.id === updatedEvent.id ? updatedEvent : e)
      }
    } else {
      console.warn('Event not found for update:', updatedEvent.id)
    }
  }

  // Handle event deletion
  const handleEventDeleted = async (deletedEventId) => {
    // Remove from events array
    events.value = events.value.filter(e => e.id !== deletedEventId)
    // Remove from filtered events array  
    filteredEvents.value = filteredEvents.value.filter(e => e.id !== deletedEventId)
    console.log('Event removed from arrays:', deletedEventId)
  }

  return {
    events: computed(() => events.value),
    filteredEvents: computed(() => filteredEvents.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    eventsLoaded: computed(() => eventsLoaded.value),
    fetchEvents,
    filterEvents,
    ensureEventDetails,
    handleEventCreated,
    handleEventUpdated,
    handleEventDeleted
  }
}