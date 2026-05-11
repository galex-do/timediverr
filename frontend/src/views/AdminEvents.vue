<template>
  <div class="admin-panel">
    <div class="admin-header">
      <div class="admin-title">
        <h2>{{ t('adminEventsTitle') }}</h2>
        <p class="admin-subtitle">{{ t('adminEventsSubtitle') }}</p>
      </div>
      <div class="action-buttons" v-if="canAccessAdmin">
        <button @click="showCreateModal = true" class="create-btn">
          <span class="btn-icon">➕</span>
          {{ t('createNewEvent') }}
        </button>
      </div>
    </div>

    <!-- Events Table -->
    <div class="table-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading events...</p>
      </div>
      
      <!-- Table Controls & Pagination -->
      <div v-if="!loading && totalEvents > 0" class="table-controls">
        <div class="table-filters">
          <div class="search-filter">
            <input 
              v-model="searchQuery"
              type="text"
              class="search-input"
              :placeholder="t('searchEventName')"
              @input="handleSearchInput"
            />
            <span v-if="searchQuery" class="clear-search" @click="clearSearch">×</span>
          </div>
          <EventTypeFilter
            :selected-lens-type="selectedLensType"
            :show-dropdown="showLensDropdown"
            @toggle-dropdown="toggleLensDropdown"
            @lens-type-changed="handleLensTypeChange"
          />
          <DatasetFilter
            :selected-dataset="selectedDataset"
            :show-dropdown="showDatasetDropdown"
            :datasets="datasets"
            @toggle-dropdown="toggleDatasetDropdown"
            @dataset-changed="handleDatasetChange"
          />
          <TagFilterDropdown
            :selected-tags="selectedTags"
            :show-dropdown="showTagDropdown"
            :all-tags="allTags"
            :is-highlighted="isTagHighlighted"
            @toggle-dropdown="toggleTagDropdown"
            @tag-toggled="handleTagToggle"
            @clear-all="handleClearAllTags"
          />
        </div>
        <TablePagination 
          :current-page="currentPage"
          :page-size="pageSize"
          :total-items="filteredTotalEvents"
          @update:current-page="handlePageChange"
          @update:page-size="handlePageSizeChange"
          :show-full-info="true"
        />
      </div>
      
      <table v-if="!loading" class="events-table">
        <thead>
          <tr>
            <th 
              class="sortable-header" 
              @click="toggleSort('name')"
              :class="{ 'active': sortField === 'name' }"
            >
              {{ t('columnName') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'name'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th>{{ t('columnDescription') }}</th>
            <th 
              class="sortable-header" 
              @click="toggleSort('date')"
              :class="{ 'active': sortField === 'date' }"
            >
              {{ t('columnDate') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'date'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th>{{ t('columnLocation') }}</th>
            <th>{{ t('columnType') }}</th>
            <th>{{ t('columnTags') }}</th>
            <th>{{ t('columnActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in currentPageEvents" :key="event.id" class="event-row">
            <td class="event-name">
              <a 
                v-if="event.source"
                :href="event.source" 
                target="_blank" 
                rel="noopener noreferrer"
                class="event-name-link" 
                :title="`${event.name} - View source`"
              >
                {{ event.name }}
              </a>
              <span v-else>{{ event.name }}</span>
            </td>
            <td class="event-description">
              <span class="description-text" :title="event.description">
                {{ event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description }}
              </span>
            </td>
            <td class="event-date">{{ formatLocalizedDate(event.event_date, event.era) }}</td>
            <td class="event-location">
              <span v-if="event.latitude && event.longitude">
                {{ event.latitude.toFixed(2) }}, {{ event.longitude.toFixed(2) }}
              </span>
              <span v-else class="no-location">No location</span>
            </td>
            <td class="event-type">
              <span class="type-badge" :class="event.lens_type">{{ event.lens_type }}</span>
            </td>
            <td class="event-tags">
              <div class="tags-container">
                <span 
                  v-for="tag in event.tags" 
                  :key="tag.id" 
                  class="tag-badge clickable-tag"
                  :style="{ backgroundColor: tag.color, color: getContrastColor(tag.color) }"
                  @click="handleTagClick(tag)"
                  :title="`Filter by ${tag.name}`"
                >
                  {{ tag.name }}
                </span>
                <span v-if="!event.tags || event.tags.length === 0" class="no-tags">No tags</span>
              </div>
            </td>
            <td class="event-actions">
              <div class="actions-wrapper">
                <button @click="editEvent(event)" class="action-btn edit-btn" title="Edit">
                  ✏️
                </button>
                <button @click="deleteEvent(event)" class="action-btn delete-btn" title="Delete">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="!loading && totalEvents === 0" class="empty-state">
        <p>No events found. Create your first historical event!</p>
      </div>
      
      <div v-if="!loading && totalEvents > 0 && filteredEvents.length === 0" class="empty-state">
        <p>No events match the selected filters. Try adjusting your event type selection.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content admin-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ editingEvent ? 'Edit Event' : 'Create New Event' }}</h3>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <EventForm
              :event="editingEvent"
              :loading="loading"
              :error="error"
              @submit="handleFormSubmit"
              @cancel="closeModal"
              @delete="handleFormDelete"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'
import { useTags } from '@/composables/useTags.js'
import { useEvents } from '@/composables/useEvents.js'
import { useLocale } from '@/composables/useLocale.js'
import { getAvailableLensTypes } from '@/utils/event-utils.js'
import apiService from '@/services/api.js'
import TablePagination from '@/components/TablePagination.vue'
import EventTypeFilter from '@/components/filters/EventTypeFilter.vue'
import DatasetFilter from '@/components/filters/DatasetFilter.vue'
import TagFilterDropdown from '@/components/filters/TagFilterDropdown.vue'
import EventForm from '@/components/events/EventForm.vue'

export default {
  name: 'AdminEvents',
  components: {
    TablePagination,
    EventTypeFilter,
    DatasetFilter,
    TagFilterDropdown,
    EventForm
  },
  setup() {
    const route = useRoute()
    const { canAccessAdmin } = useAuth()
    const { allTags, loadTags, refreshTags, createTag, setEventTags, getTagsByIds } = useTags()
    const { events, fetchEvents, loading, error, handleEventDeleted } = useEvents()
    const { t, formatLocalizedDate } = useLocale()
    
    // Local filter state for admin panel (single-select)
    const selectedLensType = ref('all')
    const showLensDropdown = ref(false)
    
    // Dataset filter state
    const selectedDataset = ref('all')
    const showDatasetDropdown = ref(false)
    const datasets = ref([])
    
    // Tag filter state
    const showTagDropdown = ref(false)
    const isTagHighlighted = ref(false)
    
    // Search filter state
    const searchQuery = ref('')
    
    // Tag filter state
    const selectedTags = ref([])
    
    // Filter methods
    const toggleLensDropdown = () => {
      showLensDropdown.value = !showLensDropdown.value
    }
    
    const handleLensTypeChange = (newLensType) => {
      selectedLensType.value = newLensType
      currentPage.value = 1 // Reset to first page when filter changes
    }
    
    // Dataset filter methods
    const toggleDatasetDropdown = () => {
      showDatasetDropdown.value = !showDatasetDropdown.value
    }
    
    const handleDatasetChange = (newDataset) => {
      selectedDataset.value = newDataset
      currentPage.value = 1 // Reset to first page when filter changes
    }
    
    // Search filter methods
    const handleSearchInput = () => {
      currentPage.value = 1 // Reset to first page when search changes
    }
    
    const clearSearch = () => {
      searchQuery.value = ''
      currentPage.value = 1
    }
    
    // Tag filter methods
    const toggleTagDropdown = () => {
      showTagDropdown.value = !showTagDropdown.value
    }
    
    const handleTagToggle = (tag) => {
      const index = selectedTags.value.findIndex(t => t.id === tag.id)
      if (index >= 0) {
        // Remove tag if already selected
        selectedTags.value.splice(index, 1)
      } else {
        // Add tag if not selected
        selectedTags.value.push(tag)
      }
      currentPage.value = 1 // Reset to first page when filter changes
    }
    
    const handleTagClick = (tag) => {
      // Check if tag is already selected
      const isSelected = selectedTags.value.some(t => t.id === tag.id)
      if (!isSelected) {
        selectedTags.value.push(tag)
        currentPage.value = 1 // Reset to first page when filter changes
        
        // Highlight the tag dropdown to show feedback
        isTagHighlighted.value = true
        setTimeout(() => {
          isTagHighlighted.value = false
        }, 600) // Match animation duration
      }
    }
    
    const handleRemoveTag = (tagId) => {
      selectedTags.value = selectedTags.value.filter(t => t.id !== tagId)
      currentPage.value = 1
    }
    
    const handleClearAllTags = () => {
      selectedTags.value = []
      currentPage.value = 1
    }
    
    const localLoading = ref(false)
    const localError = ref(null)
    
    // Fetch datasets for filter
    const fetchDatasets = async () => {
      try {
        const response = await apiService.getDatasets()
        datasets.value = Array.isArray(response) ? response.filter(d => d && d.id) : []
        console.log('Loaded datasets for filtering:', datasets.value.length)
      } catch (err) {
        console.error('Error fetching datasets for filter:', err)
        datasets.value = []
      }
    }
    
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const editingEvent = ref(null)
    
    // Sorting state
    const sortField = ref('date')
    const sortDirection = ref('asc')
    
    // Pagination state
    const currentPage = ref(1)
    const pageSize = ref(10)
    const totalEvents = ref(0)
    const displayedEvents = ref([])
    const paginatedLoading = ref(false)
    
    // All events (for filtering before pagination)
    const allEvents = ref([])
    
    // Filtered and sorted events based on lens type selection and current sort settings
    const filteredEvents = computed(() => {
      if (!allEvents.value || !Array.isArray(allEvents.value) || allEvents.value.length === 0) {
        return []
      }
      
      let filtered = allEvents.value
      
      // Apply search filter
      if (searchQuery.value && searchQuery.value.trim() !== '') {
        const query = searchQuery.value.toLowerCase().trim()
        filtered = filtered.filter(event => 
          event && event.name && event.name.toLowerCase().includes(query)
        )
      }
      
      // Apply lens type filter
      if (selectedLensType.value !== 'all') {
        filtered = filtered.filter(event => 
          event && event.lens_type && event.lens_type === selectedLensType.value
        )
      }
      
      // Apply dataset filter
      if (selectedDataset.value !== 'all') {
        if (selectedDataset.value === 'none') {
          // Filter for events with no dataset (dataset_id is null or undefined)
          filtered = filtered.filter(event => 
            !event.dataset_id || event.dataset_id === null
          )
        } else {
          // Filter for events from specific dataset
          const datasetId = parseInt(selectedDataset.value)
          filtered = filtered.filter(event => 
            event.dataset_id === datasetId
          )
        }
      }
      
      // Apply tag filter (AND logic - show events with ALL selected tags)
      if (selectedTags.value && selectedTags.value.length > 0) {
        filtered = filtered.filter(event => {
          if (!event.tags || event.tags.length === 0) return false
          return selectedTags.value.every(selectedTag => 
            event.tags.some(eventTag => eventTag.id === selectedTag.id)
          )
        })
      }
      
      // Apply sorting
      return [...filtered].sort((a, b) => {
        let aValue, bValue
        
        if (sortField.value === 'date') {
          // Use chronological sorting with proper BC/AD handling (matching main event grid)
          const getChronologicalValue = (dateString, era) => {
            let year, month, day
            
            if (dateString.startsWith('-')) {
              // Negative year format: "-3501-01-01T00:00:00Z" 
              const parts = dateString.substring(1).split('T')[0].split('-')
              year = parseInt(parts[0], 10)
              month = parseInt(parts[1], 10) - 1  // Month is 0-indexed for consistency
              day = parseInt(parts[2], 10)
            } else {
              // Positive year format
              const date = new Date(dateString)
              year = date.getFullYear()
              month = date.getMonth()
              day = date.getDate()
            }
            
            if (era === 'BC') {
              // For BC: larger year number = older (3000 BC < 1000 BC)
              // Within a BC year, months run forward: April comes before September
              // So we subtract month/day to make earlier months in the year sort first
              return -(year - (month / 12) - (day / 365))
            } else {
              // For AD: normal positive years
              return year + (month / 12) + (day / 365)
            }
          }
          
          aValue = getChronologicalValue(a.event_date || a.date || '0', a.era || 'AD')
          bValue = getChronologicalValue(b.event_date || b.date || '0', b.era || 'AD')
        } else {
          aValue = a[sortField.value] || ''
          bValue = b[sortField.value] || ''
        }
        
        if (sortDirection.value === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
    })
    
    // Update total events to reflect filtered count
    const filteredTotalEvents = computed(() => filteredEvents.value.length)
    
    // Current page of filtered events
    const currentPageEvents = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredEvents.value.slice(start, end)
    })
    
    // Active locale tab for form
    const activeLocaleTab = ref('en')
    
    const eventForm = ref({
      name: '',
      description: '',
      name_en: '',
      name_ru: '',
      description_en: '',
      description_ru: '',
      date_display: '',
      date: '',
      era: 'AD',
      latitude: null,
      longitude: null,
      lens_type: '',
      selectedTags: [],
      newTagName: '',
      newTagColor: '#3B82F6',
      tagSearch: ''
    })

    // All the helper functions from AdminPanel.vue would go here
    // (formatDate, formatDateWithEra, getContrastColor, etc.)
    
    const formatDate = (dateString) => {
      if (!dateString) return 'Invalid Date'
      
      try {
        let year, month, day
        
        if (dateString.startsWith('-')) {
          // BC date format: "-491-09-12T00:00:00Z"
          const parts = dateString.substring(1).split('T')[0].split('-')
          year = parseInt(parts[0], 10)
          month = parseInt(parts[1], 10)
          day = parseInt(parts[2], 10)
        } else {
          // AD date format: "1453-05-29T00:00:00Z"
          const date = new Date(dateString)
          if (isNaN(date.getTime())) return 'Invalid Date'
          
          return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
        
        // For BC dates, format manually
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${day} ${monthNames[month - 1]} ${year}`
      } catch {
        return 'Invalid Date'
      }
    }

    const formatDateWithEra = (dateString, era) => {
      try {
        const formattedDate = formatDate(dateString)
        if (formattedDate === 'Invalid Date') return 'Invalid Date'
        return `${formattedDate} ${era || 'AD'}`
      } catch {
        return 'Invalid Date'
      }
    }

    const getContrastColor = (hexColor) => {
      if (!hexColor) return '#000000'
      
      // Remove # if present
      const color = hexColor.replace('#', '')
      
      // Convert to RGB
      const r = parseInt(color.substr(0, 2), 16)
      const g = parseInt(color.substr(2, 2), 16)
      const b = parseInt(color.substr(4, 2), 16)
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      
      // Return black for light colors, white for dark colors
      return luminance > 0.5 ? '#000000' : '#ffffff'
    }

    // Event management functions
    const toggleSort = (field) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortField.value = field
        sortDirection.value = 'asc'
      }
    }

    const handlePageChange = (page) => {
      currentPage.value = page
    }

    const handlePageSizeChange = (size) => {
      pageSize.value = size
      currentPage.value = 1
    }

    const editEvent = (event) => {
      editingEvent.value = event
      
      // Format date properly for display (DD/MM/YYYY)
      let dateDisplay = ''
      if (event.event_date) {
        // Handle all dates - BC and AD
        const dateStr = event.event_date.toString()
        
        // Parse dates - handle negative years (BC dates in ISO format)
        if (dateStr.includes('-')) {
          let year, month, day
          
          // Handle negative year ISO format like "-3501-01-01T00:00:00.00Z"
          if (dateStr.startsWith('-')) {
            // Remove the leading minus and split
            const cleanStr = dateStr.substring(1)
            const parts = cleanStr.split('-')
            
            if (parts.length >= 3) {
              year = parseInt(parts[0])
              month = parseInt(parts[1])
              // Handle day part that might have time (like "01T00:00:00.00Z")
              day = parseInt(parts[2].split('T')[0])
            }
          } else {
            // Handle positive year format like "2024-01-01"
            const parts = dateStr.split('-')
            
            if (parts.length >= 3) {
              year = parseInt(parts[0])
              month = parseInt(parts[1])
              day = parseInt(parts[2].split('T')[0])
            }
          }
          
          if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
            dateDisplay = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
          }
        } else {
          // For other formats, try standard Date parsing
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            dateDisplay = `${day}/${month}/${year}`
          }
        }
      } else {
        // No event date available
      }
      
      eventForm.value = {
        name: event.name,
        description: event.description,
        name_en: event.name_en || event.name || '',
        name_ru: event.name_ru || event.name || '',
        description_en: event.description_en || event.description || '',
        description_ru: event.description_ru || event.description || '',
        date_display: dateDisplay,
        date: event.event_date, // Keep original date as fallback
        era: event.era || 'AD',
        latitude: event.latitude || '',
        longitude: event.longitude || '',
        lens_type: event.lens_type,
        source: event.source || '',
        dataset_id: event.dataset_id || null,
        selectedTags: event.tags ? [...event.tags] : [], // Clone array to prevent mutations
        newTagName: '',
        newTagColor: '#3B82F6',
        tagSearch: ''
      }
      
      // Convert display date to proper ISO format for backend
      if (dateDisplay) {
        updateEventDate()
      }
      showEditModal.value = true
      showCreateModal.value = false
      localError.value = null
    }

    const deleteEvent = async (event) => {
      const confirmed = confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`)
      if (!confirmed) return
      
      localLoading.value = true
      localError.value = null
      try {
        await apiService.deleteEvent(event.id)
        await fetchEvents() // Refresh events list
        allEvents.value = events.value || []
        console.log('Event deleted successfully')
      } catch (err) {
        console.error('Error deleting event:', err)
        localError.value = err.message || 'Failed to delete event'
      } finally {
        localLoading.value = false
      }
    }

    const closeModal = () => {
      showCreateModal.value = false
      showEditModal.value = false
      editingEvent.value = null
      eventForm.value = {
        name: '',
        description: '',
        name_en: '',
        name_ru: '',
        description_en: '',
        description_ru: '',
        date_display: '',
        date: '',
        era: 'AD',
        latitude: null,
        longitude: null,
        lens_type: '',
        source: '',
        dataset_id: null,
        selectedTags: [],
        newTagName: '',
        newTagColor: '#3B82F6',
        tagSearch: ''
      }
      localError.value = null
    }


    // Tag management functions and computed properties
    const filteredTags = computed(() => {
      if (!allTags.value || !eventForm.value.tagSearch) return []
      const searchTerm = eventForm.value.tagSearch.toLowerCase()
      return allTags.value
        .filter(tag => 
          tag.name.toLowerCase().includes(searchTerm) &&
          !eventForm.value.selectedTags.some(selected => selected.id === tag.id)
        )
        .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
    })

    const canCreateNewTag = computed(() => {
      if (!eventForm.value.tagSearch) return false
      const searchTerm = eventForm.value.tagSearch.toLowerCase()
      return !allTags.value.some(tag => tag.name.toLowerCase() === searchTerm)
    })

    const addTag = (tag) => {
      if (!eventForm.value.selectedTags.some(selected => selected.id === tag.id)) {
        eventForm.value.selectedTags.push(tag)
      }
      eventForm.value.tagSearch = ''
    }

    const removeTag = (tagToRemove) => {
      if (eventForm.value.selectedTags) {
        eventForm.value.selectedTags = eventForm.value.selectedTags.filter(
          tag => tag.id !== tagToRemove.id
        )
      }
    }

    const handleTagInput = () => {
      if (eventForm.value.tagSearch.trim()) {
        if (filteredTags.value.length > 0) {
          addTag(filteredTags.value[0])
        } else if (canCreateNewTag.value) {
          createAndAddTag()
        }
      }
    }

    const createAndAddTag = async () => {
      if (!eventForm.value.tagSearch.trim()) return
      
      try {
        const newTag = await apiService.createTag({
          name: eventForm.value.tagSearch.trim(),
          description: `Auto-generated tag for ${eventForm.value.tagSearch.trim()}`,
          color: eventForm.value.newTagColor
        })
        
        // Add to allTags and selected tags
        allTags.value.push(newTag)
        eventForm.value.selectedTags.push(newTag)
        eventForm.value.tagSearch = ''
        eventForm.value.newTagColor = '#3B82F6' // Reset color
      } catch (err) {
        console.error('Error creating tag:', err)
        localError.value = err.message || 'Failed to create tag'
      }
    }

    const updateEventDate = () => {
      // Convert DD/MM/YYYY to ISO date format for backend
      // Accept 1-4 digit years to support BC dates (e.g., 146 BC, 3501 BC)
      const dateDisplay = eventForm.value.date_display
      if (dateDisplay && dateDisplay.match(/^\d{2}\/\d{2}\/\d{1,4}$/)) {
        const [day, month, year] = dateDisplay.split('/')
        // Always use positive year for the date string, era field handles BC/AD
        // Pad year to 4 digits for consistency
        const paddedYear = year.padStart(4, '0')
        eventForm.value.date = `${paddedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    const handleFormSubmit = async (eventData) => {
      localLoading.value = true
      localError.value = null
      
      try {
        const tag_ids = eventData.tag_ids || []
        delete eventData.tag_ids

        if (editingEvent.value) {
          await apiService.updateEvent(editingEvent.value.id, eventData)
          
          if (tag_ids.length > 0 || (editingEvent.value.tags && editingEvent.value.tags.length > 0)) {
            await apiService.setEventTags(editingEvent.value.id, tag_ids)
          }
        } else {
          const newEvent = await apiService.createEvent(eventData)
          
          if (tag_ids.length > 0) {
            await apiService.setEventTags(newEvent.id, tag_ids)
          }
        }
        
        await fetchEvents()
        allEvents.value = events.value || []
        closeModal()
        console.log('Event saved successfully')
      } catch (err) {
        console.error('Error saving event:', err)
        localError.value = err.message || 'Failed to save event'
      } finally {
        localLoading.value = false
      }
    }

    const handleFormDelete = async () => {
      if (!editingEvent.value) return
      
      const confirmed = confirm(`Are you sure you want to delete "${editingEvent.value.name}"? This action cannot be undone.`)
      if (!confirmed) return
      
      localLoading.value = true
      localError.value = null
      try {
        await apiService.deleteEvent(editingEvent.value.id)
        await fetchEvents()
        allEvents.value = events.value || []
        closeModal()
        console.log('Event deleted successfully')
      } catch (err) {
        console.error('Error deleting event:', err)
        localError.value = err.message || 'Failed to delete event'
      } finally {
        localLoading.value = false
      }
    }

    // Handle locale changes
    const handleLocaleChange = async (event) => {
      console.log('Locale changed in AdminEvents, refetching data for locale:', event.detail)
      try {
        await fetchEvents() // Refetch events with new locale
        allEvents.value = events.value || []
        totalEvents.value = allEvents.value.length
      } catch (err) {
        console.error('Error refetching events after locale change:', err)
        localError.value = 'Failed to load data after locale change'
      }
    }

    // Load initial data
    onMounted(async () => {
      try {
        await fetchEvents()
        allEvents.value = events.value || []
        totalEvents.value = allEvents.value.length
        await loadTags()
        await fetchDatasets() // Load datasets for filtering
        
        // Check if we need to pre-select a tag from query params
        if (route.query.tag) {
          const tagId = parseInt(route.query.tag)
          const tag = allTags.value.find(t => t.id === tagId)
          if (tag) {
            selectedTags.value = [tag]
            // Highlight the tag dropdown to show feedback
            isTagHighlighted.value = true
            setTimeout(() => {
              isTagHighlighted.value = false
            }, 600)
          }
        }
        
        // Listen for locale changes
        window.addEventListener('localeChanged', handleLocaleChange)
      } catch (err) {
        console.error('Error loading admin events data:', err)
        localError.value = 'Failed to load data'
      }
    })

    // Cleanup on unmount
    onUnmounted(() => {
      window.removeEventListener('localeChanged', handleLocaleChange)
    })

    return {
      canAccessAdmin,
      loading: computed(() => loading.value || localLoading.value),
      error: computed(() => error.value || localError.value),
      showCreateModal,
      showEditModal,
      editingEvent,
      eventForm,
      t,
      formatLocalizedDate,
      getContrastColor,
      filteredEvents,
      currentPageEvents,
      filteredTotalEvents,
      handleLensTypeChange,
      toggleLensDropdown,
      selectedLensType,
      showLensDropdown,
      // Dataset filter state and methods
      selectedDataset,
      showDatasetDropdown,
      datasets,
      toggleDatasetDropdown,
      handleDatasetChange,
      // Search filter state and methods
      searchQuery,
      handleSearchInput,
      clearSearch,
      // Tag filter state and methods
      allTags,
      selectedTags,
      showTagDropdown,
      isTagHighlighted,
      toggleTagDropdown,
      handleTagToggle,
      handleTagClick,
      handleRemoveTag,
      handleClearAllTags,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      totalEvents,
      // Tag management
      filteredTags,
      canCreateNewTag,
      // Functions
      toggleSort,
      handlePageChange,
      handlePageSizeChange,
      editEvent,
      deleteEvent,
      closeModal,
      // Tag functions
      addTag,
      removeTag,
      handleTagInput,
      createAndAddTag,
      // Modal functions
      updateEventDate,
      activeLocaleTab,
      // Event form handlers
      handleFormSubmit,
      handleFormDelete,
      // Event type utilities
      getAvailableLensTypes
    }
  }
}
</script>

<style scoped>
/* Enhanced Modal Styles for Better UX */
.admin-panel {
  padding: 1.25rem 2rem;
  max-width: 100%;
  margin: 0;
  background-color: #f8fafc;
  min-height: calc(100vh - 4rem);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-title h2 {
  margin: 0;
  color: #2d3748;
  font-size: 2rem;
  font-weight: 700;
}

.admin-subtitle {
  margin: 0.5rem 0 0 0;
  color: #718096;
  font-size: 1rem;
  font-weight: 400;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.create-btn:hover {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-icon {
  font-size: 1rem;
}

.table-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: hidden;
  overflow-y: visible;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 1rem;
}

.table-filters {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.events-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.events-table th,
.events-table td {
  padding: 1rem 1.5rem;
  text-align: left;
  vertical-align: middle;
}

.events-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background-color 0.2s ease;
}

.sortable-header:hover {
  background: #f1f5f9;
}

.sortable-header.active {
  background: #e2e8f0;
}

.sort-indicator {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}

.sort-arrow {
  color: #4f46e5;
  font-weight: bold;
}

.sort-placeholder {
  color: #9ca3af;
}

.event-row {
  border-bottom: 1px solid #f1f5f9;
}

.event-row:hover {
  background: #f8fafc;
}

.event-row td {
  vertical-align: middle;
}

.event-name {
  font-weight: 600;
  color: #2d3748;
}

.event-name-link {
  color: #4f46e5;
  text-decoration: none;
  transition: all 0.2s;
  font-weight: 600;
}

.event-name-link:hover {
  color: #3730a3;
  text-decoration: underline;
}

.event-description {
  max-width: 300px;
}

.description-text {
  color: #4a5568;
  line-height: 1.4;
}

.event-date {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  color: #2d3748;
  font-weight: 500;
}

.event-location {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  color: #4a5568;
  font-size: 0.85rem;
}

.no-location {
  color: #a0aec0;
  font-style: italic;
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-badge.military { background: #fef2f2; color: #dc2626; }
.type-badge.political { background: #f0f9ff; color: #4338ca; }
.type-badge.historic { background: #f9fafb; color: #374151; }
.type-badge.cultural { background: #f0fdf4; color: #16a34a; }
.type-badge.scientific { background: #fefce8; color: #ca8a04; }

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 200px;
}

.tag-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.no-tags {
  color: #a0aec0;
  font-style: italic;
  font-size: 0.8rem;
}

.event-actions {
  vertical-align: middle;
  text-align: center;
}

.actions-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  width: 2.25rem;
  height: 2.25rem;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
  transform: scale(1.1);
}

.delete-btn {
  background: #fef2f2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
  transform: scale(1.1);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  color: #6b7280;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Enhanced Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 2rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 900px; /* Much wider modal */
  max-height: 95vh;
  overflow-y: auto;
}

.admin-modal {
  max-width: 900px; /* Consistent with modal-content */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.75rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
  transform: scale(1.1);
}

.modal-body {
  padding: 1.75rem 2.5rem;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border-left: 4px solid #dc2626;
  font-weight: 500;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two columns for wider modal */
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
}

/* Enhanced Input Styling */
.form-input, .form-textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: white;
  color: #1f2937;
  box-sizing: border-box;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
  background: #fefefe;
}

/* Enhanced Select Styling */
select.form-input {
  background: white;
  color: #1f2937;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  appearance: none;
  padding-right: 3rem;
}

select.form-input:hover {
  border-color: #9ca3af;
}

select.form-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

/* Enhanced Textarea */
.form-textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
  font-family: inherit;
}

.form-hint {
  display: block;
  margin-top: 0.75rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

/* Enhanced Tags Section */
.tags-section {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  background: #f9fafb;
  transition: border-color 0.2s;
}

.tags-section:focus-within {
  border-color: #4f46e5;
  background: white;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  min-height: 2rem;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.selected-tag:hover {
  transform: translateY(-1px);
}

.remove-tag-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.3rem;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-tag-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.tag-input-section {
  position: relative;
}

.tag-search-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  transition: all 0.2s;
  box-sizing: border-box;
}

.tag-search-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 10px 10px;
  max-height: 350px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Show scroll hint when there are many tags */
.tag-suggestions::-webkit-scrollbar {
  width: 8px;
}

.tag-suggestions::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 0 0 10px 0;
}

.tag-suggestions::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.tag-suggestions::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.tag-count-info {
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  text-align: center;
}

.tag-suggestion {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.tag-suggestion:hover {
  background: #f0f9ff;
}

.tag-suggestion:last-child {
  border-bottom: none;
}

.tag-color-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.create-new-suggestion {
  background: #f0f9ff;
  border-top: 2px solid #bfdbfe;
  color: #0369a1;
  font-weight: 600;
}

.inline-color-picker {
  width: 24px;
  height: 24px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  margin-left: auto;
}

.new-tag-option {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e5e7eb;
}

.new-tag-form {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
}

.new-tag-text {
  color: #374151;
  font-weight: 600;
}

.color-picker {
  width: 48px;
  height: 48px;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.color-picker:hover {
  border-color: #9ca3af;
}

.create-tag-btn {
  padding: 0.75rem 1.5rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-tag-btn:hover {
  background: #4338ca;
}

/* Enhanced Form Actions */
.form-actions {
  display: flex;
  gap: 1.5rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px solid #e5e7eb;
}

.cancel-btn {
  padding: 1rem 2rem;
  background: white;
  color: #374151;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.cancel-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.submit-btn {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #4f46e5, #3730a3);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  flex: 1;
  font-size: 1rem;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
}

.submit-btn:hover {
  background: linear-gradient(135deg, #4338ca, #312e81);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Locale tabs styling */
.locale-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.locale-tab {
  flex: 1;
  padding: 10px 20px;
  border: none;
  background: #f8f9fa;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  font-size: 14px;
  color: #666;
}

.locale-tab:hover {
  background: #e9ecef;
}

.locale-tab.active {
  background: white;
  border-bottom-color: #007cba;
  color: #007cba;
  font-weight: 500;
}

.locale-content {
  margin-bottom: 15px;
}

/* Search Filter Styles */
.search-filter {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.search-input {
  height: 36px;
  padding: 0 2rem 0 0.75rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
  min-width: 220px;
  outline: none;
}

.search-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.search-input::placeholder {
  color: #a0aec0;
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
  transition: color 0.2s;
}

.clear-search:hover {
  color: #4f46e5;
}

/* Clickable tags in table */
.clickable-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.clickable-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  filter: brightness(1.1);
}
</style>