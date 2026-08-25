import { ref, computed, watch } from 'vue'
import apiService from '@/services/api.js'
import { parseHistoricalDate } from '@/utils/date-utils.js'
import { getEraFromDate } from '@/utils/date-utils.js'
import { useLocale } from '@/composables/useLocale.js'

// Shared state - singleton pattern
const events = ref([])
const filteredEvents = ref([])
const loading = ref(false)
const error = ref(null)
const eventsLoaded = ref(false)

export function useEvents() {
  const { locale } = useLocale()

  // Watch locale changes and re-fetch events
  watch(locale, async () => {
    console.log('Locale changed, re-fetching events')
    await fetchEvents()
  })

  // Fetch all events from API
  const fetchEvents = async () => {
    loading.value = true
    error.value = null
    
    try {
      const eventData = await apiService.getEvents()
      events.value = Array.isArray(eventData) ? eventData : []
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
    handleEventCreated,
    handleEventUpdated,
    handleEventDeleted
  }
}