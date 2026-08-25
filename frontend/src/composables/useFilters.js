import { ref, computed, watch } from 'vue'
import { parseDDMMYYYYToISO, formatDateToDDMMYYYY, getTodayISO, parseHistoricalDate, formatHistoricalDate, historicalDateToISO } from '@/utils/date-utils.js'
import { getAvailableLensTypes } from '@/utils/event-utils.js'

// Session storage keys
const STORAGE_KEYS = {
  DATE_FROM: 'historia_date_from',
  DATE_TO: 'historia_date_to', 
  DATE_FROM_DISPLAY: 'historia_date_from_display',
  DATE_TO_DISPLAY: 'historia_date_to_display',
  SELECTED_LENS_TYPES: 'historia_selected_lens_types',
  SELECTED_TAGS: 'historia_selected_tags'
}

// Load filter state from session storage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = sessionStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.warn('Error loading from session storage:', error)
    return defaultValue
  }
}

// Save filter state to session storage
const saveToStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Error saving to session storage:', error)
  }
}

// Shared state - singleton pattern  
// Date filtering state (load from session storage or use defaults)
const dateFrom = ref(loadFromStorage(STORAGE_KEYS.DATE_FROM, '0001-01-01'))
const dateTo = ref(loadFromStorage(STORAGE_KEYS.DATE_TO, getTodayISO()))
const dateFromDisplay = ref(loadFromStorage(STORAGE_KEYS.DATE_FROM_DISPLAY, '1 AD'))
const dateToDisplay = ref(loadFromStorage(STORAGE_KEYS.DATE_TO_DISPLAY, '2025 AD'))

// Lens type filtering state (load from session storage or use all types as default)
const selectedLensTypes = ref(loadFromStorage(STORAGE_KEYS.SELECTED_LENS_TYPES, ['historic', 'political', 'cultural', 'military', 'scientific', 'religious']))
const showLensDropdown = ref(false)

// Tag filtering state (load from session storage or use empty array as default)
const selectedTags = ref(loadFromStorage(STORAGE_KEYS.SELECTED_TAGS, []))

export function useFilters() {

  // Setup watchers to save filter state to session storage
  watch(dateFrom, (newValue) => {
    saveToStorage(STORAGE_KEYS.DATE_FROM, newValue)
  })

  watch(dateTo, (newValue) => {
    saveToStorage(STORAGE_KEYS.DATE_TO, newValue)
  })

  watch(dateFromDisplay, (newValue) => {
    saveToStorage(STORAGE_KEYS.DATE_FROM_DISPLAY, newValue)
  })

  watch(dateToDisplay, (newValue) => {
    saveToStorage(STORAGE_KEYS.DATE_TO_DISPLAY, newValue)
  })

  watch(selectedLensTypes, (newValue) => {
    saveToStorage(STORAGE_KEYS.SELECTED_LENS_TYPES, newValue)
  }, { deep: true })

  watch(selectedTags, (newValue) => {
    saveToStorage(STORAGE_KEYS.SELECTED_TAGS, newValue)
  }, { deep: true })

  // Available lens types
  const availableLensTypes = computed(() => getAvailableLensTypes())

  // Reset to default date range
  const resetToDefaultDateRange = () => {
    dateFrom.value = '0001-01-01'
    dateTo.value = getTodayISO()
    dateFromDisplay.value = '1 AD'
    dateToDisplay.value = '2025 AD'
  }

  // Update date from display
  const updateDateFrom = (displayValue) => {
    // Always update the display value to maintain user input
    dateFromDisplay.value = displayValue
    
    // Try to parse as historical date first
    const historicalDate = parseHistoricalDate(displayValue)
    if (historicalDate) {
      dateFrom.value = historicalDate.isoDate
      return
    }
    
    // Fallback to DD.MM.YYYY format
    const isoDate = parseDDMMYYYYToISO(displayValue)
    if (isoDate) {
      dateFrom.value = isoDate
    }
    // Note: Don't reset display value on invalid input to preserve user's typing
  }

  // Update date to display
  const updateDateTo = (displayValue) => {
    // Always update the display value to maintain user input
    dateToDisplay.value = displayValue
    
    // Try to parse as historical date first
    const historicalDate = parseHistoricalDate(displayValue)
    if (historicalDate) {
      dateTo.value = historicalDate.isoDate
      return
    }
    
    // Fallback to DD.MM.YYYY format
    const isoDate = parseDDMMYYYYToISO(displayValue)
    if (isoDate) {
      dateTo.value = isoDate
    }
    // Note: Don't reset display value on invalid input to preserve user's typing
  }

  // Apply template dates
  const applyTemplateDates = (templateData) => {
    if (!templateData) return

    dateFrom.value = templateData.dateFrom
    dateTo.value = templateData.dateTo
    dateFromDisplay.value = templateData.displayFrom
    dateToDisplay.value = templateData.displayTo
  }

  // Toggle lens dropdown
  const toggleLensDropdown = () => {
    showLensDropdown.value = !showLensDropdown.value
  }

  // Handle lens types change
  const handleLensTypesChange = (newLensTypes) => {
    selectedLensTypes.value = newLensTypes
  }

  // Close dropdown when clicking outside
  const closeLensDropdown = () => {
    showLensDropdown.value = false
  }

  // Tag filtering methods
  const addTag = (tag, negative = false) => {
    if (!selectedTags.value.find(t => t.id === tag.id)) {
      selectedTags.value = [...selectedTags.value, { ...tag, negative }]
    }
  }

  const removeTag = (tagId) => {
    selectedTags.value = selectedTags.value.filter(t => t.id !== tagId)
  }

  const clearTags = () => {
    selectedTags.value = []
  }

  // Toggle a selected tag between positive ("must have") and negative ("must not have")
  const toggleTagNegative = (tagId) => {
    selectedTags.value = selectedTags.value.map(t =>
      t.id === tagId ? { ...t, negative: !t.negative } : t
    )
  }

  return {
    // State
    dateFrom: computed(() => dateFrom.value),
    dateTo: computed(() => dateTo.value),
    dateFromDisplay: computed(() => dateFromDisplay.value),
    dateToDisplay: computed(() => dateToDisplay.value),
    selectedLensTypes: computed(() => selectedLensTypes.value),
    showLensDropdown: computed(() => showLensDropdown.value),
    availableLensTypes,
    selectedTags: computed(() => selectedTags.value),

    // Methods
    resetToDefaultDateRange,
    updateDateFrom,
    updateDateTo,
    applyTemplateDates,
    toggleLensDropdown,
    handleLensTypesChange,
    closeLensDropdown,
    addTag,
    removeTag,
    clearTags,
    toggleTagNegative
  }
}