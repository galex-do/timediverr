<template>
  <div class="map-view">
    <!-- Enhanced Filter Bar -->
    <DateControlBar
      :date-from-display="dateFromDisplay"
      :date-to-display="dateToDisplay"
      :template-groups="templateGroups"
      :available-templates="availableTemplates"
      :selected-template-group-id="selectedTemplateGroupId"
      :selected-template-id="selectedTemplateId"
      :selected-template="selectedTemplate"
      :loading-templates="templatesLoading"
      @date-from-changed="handleDateFromChange"
      @date-to-changed="handleDateToChange"
      @template-group-changed="handleTemplateGroupChange"
      @template-changed="handleTemplateChange"
      @apply-filters="applyFilters"
    />
    
    <!-- Main Layout: Events Sidebar + Map -->
    <div class="main-layout">
      <!-- Left Events Sidebar (Collapsible) -->
      <aside class="events-sidebar" :class="{ 'collapsed': sidebarCollapsed }">
        <!-- Sidebar Header -->
        <div class="sidebar-header">
          <h3 class="section-title" v-show="!sidebarCollapsed">{{ t('historicalEvents') }}</h3>
          <button class="sidebar-toggle" @click="toggleSidebar">
            {{ sidebarCollapsed ? '›' : '‹' }}
          </button>
        </div>
        
        <!-- Events List in Sidebar -->
        <div class="events-sidebar-content" v-show="!sidebarCollapsed">
          <EventsGrid
            :events="displayedEvents"
            :selected-tags="selectedTags"
            :date-from-display="dateFromDisplay"
            :date-to-display="dateToDisplay"
            :follow-enabled="narrativeFlowEnabled"
            :map-filter-enabled="mapFilterEnabled"
            :share-copied="share_copied"
            @focus-event="focusOnEvent"
            @highlight-event="highlightOnEvent"
            @map-filter-toggle="handleMapFilterToggle"
            @tag-clicked="handleTagClick"
            @remove-tag="handleRemoveTag"
            @toggle-tag-negative="handleToggleTagNegative"
            @clear-all-tags="handleClearAllTags"
            @toggle-follow="handleToggleNarrativeFlow"
            @focus-on-filtered="handleFocusOnFiltered"
            @geolocate="handleGeolocate"
            @share="handleShareUrl"
            @edit-event="handleEditEvent"
            @back-to-location="handleBackToLocation"
            @expand-date-range="handleExpandDateRange"
            ref="eventsGrid"
          />
        </div>
      </aside>
      
      <!-- Right Map Area (Full Height) -->
      <main class="map-content-area">
        <WorldMap 
          :events="filteredEvents" 
          :focus-event="focusEvent"
          :narrative-flow-enabled="narrativeFlowEnabled"
          :map-filter-enabled="mapFilterEnabled"
          :regions="regions"
          @event-created="handleEventCreated"
          @event-updated="handleEventUpdated"
          @event-deleted="handleEventDeleted"
          @map-bounds-changed="handleMapBoundsChanged"
          @locale-changed="handleLocaleChanged"
          @tag-clicked="handleTagClick"
          @show-detail="handleShowDetailFromMap"
          ref="worldMap"
        />
      </main>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import DateControlBar from '@/components/filters/DateControlBar.vue'
import WorldMap from '@/components/WorldMap.vue'
import EventsGrid from '@/components/events/EventsGrid.vue'
import { useEvents } from '@/composables/useEvents.js'
import { useTemplates } from '@/composables/useTemplates.js'
import { useFilters } from '@/composables/useFilters.js'
import { useTags } from '@/composables/useTags.js'
import { useLocale } from '@/composables/useLocale.js'
import { useUrlState } from '@/composables/useUrlState.js'
import apiService from '@/services/api.js'

export default {
  name: 'MapView',
  components: {
    DateControlBar,
    WorldMap,
    EventsGrid
  },
  setup() {
    // Sidebar state with session storage
    const SIDEBAR_STORAGE_KEY = 'historia_sidebar_collapsed'
    const loadSidebarState = () => {
      try {
        const stored = sessionStorage.getItem(SIDEBAR_STORAGE_KEY)
        return stored ? JSON.parse(stored) : false
      } catch (error) {
        return false
      }
    }
    
    const sidebarCollapsed = ref(loadSidebarState())
    const focusEvent = ref(null)
    const worldMap = ref(null)
    const eventsGrid = ref(null)
    
    const regions = ref([])
    
    // Map filter state
    const mapFilterEnabled = ref(false)
    const mapBounds = ref(null)
    let boundsDebounceTimer = null // Debounce timer to prevent oscillation loop
    
    // Narrative flow state
    const narrativeFlowEnabled = ref(false)
    
    // Save sidebar state to session storage
    watch(sidebarCollapsed, (newValue) => {
      try {
        sessionStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newValue))
      } catch (error) {
        console.warn('Error saving sidebar state:', error)
      }
    })

    // Composables
    const { 
      filteredEvents, 
      fetchEvents, 
      filterEvents, 
      handleEventCreated,
      handleEventUpdated,
      handleEventDeleted,
      eventsLoaded
    } = useEvents()

    const {
      templateGroups,
      availableTemplates,
      selectedTemplateGroupId,
      selectedTemplateId,
      selectedTemplate,
      loading: templatesLoading,
      fetchTemplateGroups,
      handleTemplateGroupChange: templateGroupChange,
      handleTemplateChange: templateChange,
      applyTemplate,
      getGroupDateRange
    } = useTemplates()

    const {
      dateFrom,
      dateTo,
      dateFromDisplay,
      dateToDisplay,
      selectedLensTypes,
      showLensDropdown,
      selectedTags,
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
    } = useFilters()

    const {
      allTags,
      isLoadingTags,
      loadTags
    } = useTags()

    // Use locale for UI translations
    const { t } = useLocale()

    // URL state sharing
    const share_copied = ref(false)
    const {
      initialize_from_url,
      copy_share_url,
      update_url_silently,
      has_url_params,
      setup_url_sync
    } = useUrlState({
      dateFromDisplay,
      dateToDisplay,
      selectedTags,
      updateDateFrom,
      updateDateTo,
      addTag,
      clearTags,
      allTags,
      getMapState: () => worldMap.value?.getMapState?.(),
      setMapState: (lat, lng, zoom) => {
        if (worldMap.value?.setMapState) {
          worldMap.value.setMapState(lat, lng, zoom)
        }
      }
    })

    // Setup URL sync for filter changes
    setup_url_sync()

    // Sidebar methods
    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
      // Trigger map resize after sidebar animation
      nextTick(() => {
        setTimeout(() => {
          triggerMapResize()
        }, 300) // Match transition duration
      })
    }

    const triggerMapResize = () => {
      // Trigger a custom event that the map can listen for
      window.dispatchEvent(new Event('resize'))
    }

    // Template methods
    const handleTemplateGroupChange = async (groupId) => {
      await templateGroupChange(groupId)
      regions.value = []
      if (!groupId) {
        resetToDefaultDateRange()
      } else if (groupId === 'custom') {
        console.log('Switched to Custom date range mode')
      } else {
        const groupRange = getGroupDateRange()
        if (groupRange) {
          applyTemplateDates(groupRange)
          console.log(`Applied group date range: ${groupRange.displayFrom} - ${groupRange.displayTo}`)
        }
      }
      applyFilters()
    }

    const fetchRegionsForTemplate = async (templateId) => {
      if (!templateId) {
        regions.value = []
        return
      }
      try {
        const data = await apiService.getRegionsByTemplate(templateId)
        regions.value = Array.isArray(data) ? data : []
      } catch (err) {
        console.error('Error fetching regions for template:', err)
        regions.value = []
      }
    }

    const handleTemplateChange = (templateId) => {
      templateChange(templateId)
      const templateData = applyTemplate()
      if (templateData) {
        applyTemplateDates(templateData)
        console.log(`Selected template: ${selectedTemplate.value.name} (${templateData.displayFrom} - ${templateData.displayTo})`)
      }
      applyFilters()
      fetchRegionsForTemplate(templateId)
    }
    
    // Enhanced date update methods that switch to custom mode
    const handleDateFromChange = (newValue, isStepping = false) => {
      // Switch to custom mode when user manually changes dates (but not when stepping)
      if (!isStepping && selectedTemplateGroupId.value && selectedTemplateGroupId.value !== 'custom') {
        templateGroupChange('custom')
        console.log('Switched to Custom mode due to manual date change')
      }
      updateDateFrom(newValue)
      applyFilters(isStepping)
    }
    
    const handleDateToChange = (newValue, isStepping = false) => {
      // Switch to custom mode when user manually changes dates (but not when stepping)
      if (!isStepping && selectedTemplateGroupId.value && selectedTemplateGroupId.value !== 'custom') {
        templateGroupChange('custom')
        console.log('Switched to Custom mode due to manual date change')
      }
      updateDateTo(newValue)
      applyFilters(isStepping)
    }

    // Filter methods
    const applyFilters = (isStepping = false) => {
      if (worldMap.value && worldMap.value.clearHighlight) {
        worldMap.value.clearHighlight()
      }

      filterEvents(
        dateFrom.value,
        dateTo.value,
        selectedLensTypes.value,
        selectedTemplate.value,
        dateFromDisplay.value,
        dateToDisplay.value,
        selectedTags.value
      )
      
      // Signal WorldMap component about stepping state
      if (worldMap.value && worldMap.value.setSteppingMode) {
        worldMap.value.setSteppingMode(isStepping)
      }
    }

    // Event focus method
    const focusOnEvent = (event) => {
      focusEvent.value = { ...event, timestamp: Date.now() }
    }

    // Event highlight method (without refocusing map)
    const highlightOnEvent = (event) => {
      if (worldMap.value && worldMap.value.highlightMarker) {
        worldMap.value.highlightMarker(event)
      }
    }

    const handleFocusOnFiltered = () => {
      if (worldMap.value && worldMap.value.fit_map_to_events) {
        worldMap.value.fit_map_to_events()
      }
    }

    // Geolocation handler - center map on user's location
    const handleGeolocate = (coords) => {
      if (worldMap.value && worldMap.value.centerOnCoordinates) {
        worldMap.value.centerOnCoordinates(coords.latitude, coords.longitude, 12)
      }
    }

    // Map filter methods
    const handleMapFilterToggle = (enabled) => {
      mapFilterEnabled.value = enabled
      if (enabled && worldMap.value) {
        // Get current map bounds when enabling filter
        worldMap.value.getCurrentBounds().then(bounds => {
          mapBounds.value = bounds
        })
      } else if (!enabled && worldMap.value) {
        // Clear highlight overlay when disabling map filter
        worldMap.value.clearHighlight()
      }
    }

    // Debounce timer for URL updates
    let urlUpdateTimer = null
    
    const handleMapBoundsChanged = (bounds) => {
      if (mapFilterEnabled.value) {
        // Debounce bounds updates to prevent oscillation loop
        // When event grid height changes, map resizes, which changes bounds,
        // which changes displayed events, which changes grid height again...
        // Debouncing breaks this feedback loop by waiting for layout to settle
        if (boundsDebounceTimer) {
          clearTimeout(boundsDebounceTimer)
        }
        boundsDebounceTimer = setTimeout(() => {
          mapBounds.value = bounds
          boundsDebounceTimer = null
        }, 200) // 200ms delay allows layout to stabilize
      }
      
      // Update URL with map position (debounced)
      if (urlUpdateTimer) {
        clearTimeout(urlUpdateTimer)
      }
      urlUpdateTimer = setTimeout(() => {
        const mapState = worldMap.value?.getMapState?.()
        if (mapState) {
          update_url_silently(mapState)
        }
        urlUpdateTimer = null
      }, 500) // 500ms delay to avoid too frequent URL updates
    }

    const isEventInBounds = (event, bounds) => {
      if (!bounds || !event.latitude || !event.longitude) {
        return true
      }
      
      const lat = parseFloat(event.latitude)
      const lng = parseFloat(event.longitude)
      
      return lat >= bounds.south && 
             lat <= bounds.north && 
             lng >= bounds.west && 
             lng <= bounds.east
    }

    // Computed property for events displayed in sidebar
    const displayedEvents = computed(() => {
      if (!mapFilterEnabled.value || !mapBounds.value) {
        return filteredEvents.value
      }
      
      return filteredEvents.value.filter(event => 
        isEventInBounds(event, mapBounds.value)
      )
    })

    // Tag filtering handlers
    const handleTagClick = (tag) => {
      addTag(tag)
      applyFilters()
    }

    const handleRemoveTag = (tagId) => {
      removeTag(tagId)
      // Disable narrative flow if no tags remain
      if (selectedTags.value.length === 0) {
        narrativeFlowEnabled.value = false
      }
      applyFilters()
    }

    const handleClearAllTags = () => {
      clearTags()
      narrativeFlowEnabled.value = false
      applyFilters()
    }

    const handleToggleTagNegative = (tagId) => {
      toggleTagNegative(tagId)
      applyFilters()
    }

    const handleExpandDateRange = ({ fromDisplay, toDisplay }) => {
      updateDateFrom(fromDisplay)
      updateDateTo(toDisplay)
      clearTags()
      narrativeFlowEnabled.value = false
      applyFilters()
    }
    
    const handleToggleNarrativeFlow = () => {
      narrativeFlowEnabled.value = !narrativeFlowEnabled.value
    }

    const handleShowDetail = (event, source = null) => {
      if (eventsGrid.value) {
        eventsGrid.value.openEventDetail(event, source)
      }
    }

    const handleShowDetailFromMap = (payload) => {
      // Handle both old format (just event) and new format ({ event, source })
      if (payload.event) {
        handleShowDetail(payload.event, payload.source)
      } else {
        handleShowDetail(payload, null)
      }
    }

    const handleEditEvent = (event) => {
      if (worldMap.value) {
        worldMap.value.edit_event(event.id)
      }
    }

    const handleBackToLocation = () => {
      if (worldMap.value) {
        worldMap.value.restore_location_modal()
      }
    }

    // Click outside to close dropdown
    const handleClickOutside = (event) => {
      // Close lens dropdown if clicking outside
      if (showLensDropdown.value && !event.target.closest('.multiselect-container')) {
        closeLensDropdown()
      }
    }

    // Watch for events loading and apply filters immediately
    watch(eventsLoaded, (loaded) => {
      if (loaded) {
        console.log('Events loaded, applying filters immediately')
        applyFilters()
      }
    })

    // Handle locale changes
    const handleLocaleChanged = async (locale) => {
      console.log('Locale changed in MapView, refetching events for locale:', locale)
      try {
        // Preserve current map view during locale change
        worldMap.value?.preserveCurrentView?.()
        await fetchEvents() // Refetch events with new locale
        // Reapply current filters to the newly fetched events
        applyFilters()
      } catch (err) {
        console.error('Error refetching events after locale change:', err)
      }
    }

    // Share URL handler
    const handleShareUrl = async () => {
      const mapState = worldMap.value?.getMapState?.()
      const result = await copy_share_url(mapState)
      if (result.success) {
        share_copied.value = true
        setTimeout(() => {
          share_copied.value = false
        }, 2000)
      }
    }

    // Initialize data on mount
    onMounted(async () => {
      // Check for URL params and apply them after tags are loaded
      const checkAndApplyUrlParams = () => {
        if (allTags.value && allTags.value.length > 0) {
          const applied = initialize_from_url(allTags.value)
          if (applied) {
            console.log('Applied URL state to filters')
            applyFilters()
          }
        }
      }

      // Watch for tags to load if URL has params
      if (has_url_params()) {
        if (allTags.value && allTags.value.length > 0) {
          checkAndApplyUrlParams()
        } else {
          const unwatchTags = watch(allTags, (tags) => {
            if (tags && tags.length > 0) {
              checkAndApplyUrlParams()
              unwatchTags()
            }
          })
        }
      }
      
      // Apply filters if events are already loaded
      if (eventsLoaded.value) {
        applyFilters()
      }

      if (selectedTemplateId.value) {
        fetchRegionsForTemplate(selectedTemplateId.value)
      }
      
      // Add click outside listener
      document.addEventListener('click', handleClickOutside)
    })

    return {
      // Sidebar state
      sidebarCollapsed,
      focusEvent,

      // Events
      filteredEvents,
      handleEventCreated,
      handleEventUpdated,
      handleEventDeleted,
      handleLocaleChanged,

      // Templates
      templateGroups,
      availableTemplates,
      selectedTemplateGroupId,
      selectedTemplateId,
      selectedTemplate,
      templatesLoading,
      handleTemplateGroupChange,
      handleTemplateChange,

      // Filters
      dateFromDisplay,
      dateToDisplay,
      selectedLensTypes,
      showLensDropdown,
      selectedTags,
      handleDateFromChange,
      handleDateToChange,
      toggleLensDropdown,
      handleLensTypesChange,

      // Tags
      allTags,
      isLoadingTags,

      // Methods
      toggleSidebar,
      applyFilters,
      focusOnEvent,
      highlightOnEvent,
      handleGeolocate,
      handleTagClick,
      handleRemoveTag,
      handleToggleTagNegative,
      handleClearAllTags,
      handleExpandDateRange,
      handleToggleNarrativeFlow,
      handleFocusOnFiltered,

      // Map filter
      displayedEvents,
      mapFilterEnabled,
      handleMapFilterToggle,
      handleMapBoundsChanged,
      worldMap,
      eventsGrid,
      handleShowDetail,
      handleShowDetailFromMap,
      handleEditEvent,
      handleBackToLocation,
      
      // Narrative flow
      narrativeFlowEnabled,

      // Regions
      regions,

      // URL sharing
      share_copied,
      handleShareUrl,

      // Localization
      t
    }
  }
}
</script>

<style scoped>
.map-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px); /* Account for header */
}

/* Main Layout */
.main-layout {
  display: flex;
  flex: 1;
  height: calc(100vh - 160px); /* Account for header + enhanced filter bar */
  overflow: visible; /* Allow tag dropdown to appear above map */
}

/* Events Sidebar */
.events-sidebar {
  background: #ffffff;
  color: #2d3748;
  position: relative;
  transition: all 0.3s ease;
  width: 350px;
  flex-shrink: 0;
  overflow: visible;
  border-right: none;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08), 1px 0 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.events-sidebar.collapsed {
  width: 60px;
}

.events-sidebar.collapsed .sidebar-header {
  padding: 1rem 0.5rem 1rem;
  justify-content: center;
}

.events-sidebar.collapsed .sidebar-toggle {
  margin: 0;
}

.sidebar-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.section-title {
  color: #1e293b;
  margin: 0;
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.sidebar-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #4a5568;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: auto;
}

.sidebar-toggle:hover {
  background: #f1f5f9;
  color: #2d3748;
  border-color: #cbd5e0;
}

.events-sidebar-content {
  flex: 1;
  overflow-y: auto;
}

/* Map Content Area (Full Space) */
.map-content-area {
  flex: 1;
  background: #ffffff;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
    height: calc(100vh - 160px);
  }
  
  .events-sidebar {
    width: 100%;
    height: auto;
    flex: 0 0 auto;
    order: 1;
    overflow: visible;
  }
  
  .events-sidebar.collapsed {
    height: 60px;
    width: 100%;
  }
  
  .map-content-area {
    flex: 1;
    order: 2;
    min-height: 50vh;
  }
}

@media (max-width: 768px) {
  .main-layout {
    height: auto;
    min-height: calc(100vh - 140px);
  }
  
  .events-sidebar {
    height: auto; /* Content-dependent height - just wraps controls */
    flex: 0 0 auto; /* Don't grow, just wrap content */
    overflow: visible; /* Allow tag filter panel to expand */
  }
  
  .events-sidebar-content {
    overflow: visible; /* Don't clip tag filter panel */
  }
  
  /* Hide sidebar toggle on mobile - sidebar should always be visible */
  .sidebar-toggle {
    display: none;
  }
  
  /* Prevent sidebar from collapsing on mobile */
  .events-sidebar.collapsed {
    height: auto;
  }
  
  .section-title {
    display: block !important; /* Always show title on mobile */
  }
  
  .map-content-area {
    min-height: 60vh; /* Map takes most of the screen on mobile */
    flex: 1;
  }
}
</style>