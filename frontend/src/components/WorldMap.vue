<template>
  <div class="map-container">
    <div ref="map" class="leaflet-map"></div>
    
    <!-- Pin Mode Indicator -->
    <transition name="fade">
      <div v-if="pin_mode" class="pin-mode-indicator">
        📍 {{ t('pinModeActive') || 'Click on map to set location' }}
        <span class="pin-mode-hint">{{ t('pinModeHint') || '(Right-click or Esc to cancel)' }}</span>
      </div>
    </transition>
    
    <!-- Event Creation Modal (only show if user can create events) -->
    <div v-if="show_event_modal && canCreateEvents" class="modal-overlay" @click="close_modal">
      <div class="modal-content event-form-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editing_event ? 'Edit Historical Event' : 'Add Historical Event' }}</h3>
          <button @click="close_modal" class="close-btn">&times;</button>
        </div>
        <EventForm
          :event="editing_event"
          :initial-latitude="new_event.latitude"
          :initial-longitude="new_event.longitude"
          :loading="form_loading"
          :error="form_error"
          :pin-mode="pin_mode"
          @submit="handle_form_submit"
          @cancel="close_modal"
          @delete="delete_event"
          @toggle-pin="toggle_pin_mode"
        />
      </div>
    </div>

    <!-- Event Info Modal (shows event details without coordinate corruption) -->
    <div v-if="show_event_info_modal" class="modal_overlay_base event_info_modal_overlay" @click="close_event_info_modal">
      <div class="event_info_modal modal_fullscreen_mobile" @click.stop>
        <!-- Modal Header -->
        <div class="event_info_modal_header">
          <h2 class="event_info_modal_title">
            {{ location_total_event_count }} {{ t('eventsAtLocation') }}
          </h2>
          <div class="event_header_actions">
            <button 
              class="toggle_details_btn" 
              @click="toggle_location_details"
              :title="location_show_details ? t('hideDetails') : t('showDetails')"
            >
              {{ location_show_details ? '📝' : '📋' }}
            </button>
            <button 
              v-if="canCreateEvents" 
              class="event_add_btn" 
              @click="create_event_at_location"
              title="Create new event at this location"
            >
              +
            </button>
            <button class="event_close_btn" @click="close_event_info_modal">×</button>
          </div>
        </div>
        
        <!-- Modal Content -->
        <div class="event_info_modal_content" ref="locationModalContent" @scroll="handle_location_scroll">
          <div class="timeline_container">
            <div v-for="yearGroup in visible_grouped_events" :key="yearGroup.yearKey" class="timeline_year_group" :data-year-key="yearGroup.yearKey">
              <!-- Single event in this year: everything on one line -->
              <div v-if="yearGroup.totalEvents === 1" class="timeline_single_event_line">
                <div class="timeline_bullet"></div>
                <span class="timeline_single_text">
                  <span class="timeline_date_inline">{{ yearGroup.dateGroups[0].events[0]._formattedDate }}</span>
                  {{ ' ' }}
                  <span class="event_icon">{{ get_event_emoji(yearGroup.dateGroups[0].events[0].lens_type, yearGroup.dateGroups[0].events[0].tags) }}</span>
                  {{ ' ' }}
                  <span 
                     class="event_name event_name_link"
                     @click="handle_show_detail(yearGroup.dateGroups[0].events[0])"
                  >{{ yearGroup.dateGroups[0].events[0].name }}</span>
                  <template v-if="!location_show_details && getKeyColorTags(yearGroup.dateGroups[0].events[0].tags).length > 0">
                    <span 
                      v-for="kt in getKeyColorTags(yearGroup.dateGroups[0].events[0].tags)" 
                      :key="'kc-' + kt.id"
                      class="key_color_dot"
                      :style="{ backgroundColor: kt.color }"
                      :title="kt.name"
                    ></span>
                  </template>
                  <template v-if="location_show_details && yearGroup.dateGroups[0].events[0].description">
                    <div class="event_description_text">{{ format_description_inline(yearGroup.dateGroups[0].events[0].description) }}</div>
                  </template>
                  <template v-if="location_show_details && yearGroup.dateGroups[0].events[0].tags && yearGroup.dateGroups[0].events[0].tags.length > 0">
                    {{ ' ' }}
                    <span class="tags_expand_wrapper" :class="{ 'expanded': isEventTagsExpanded(yearGroup.dateGroups[0].events[0].id) }" @mouseenter="onTagsHover(yearGroup.dateGroups[0].events[0].id)" @mouseleave="onTagsLeave(yearGroup.dateGroups[0].events[0].id)">
                      <span 
                        class="tags_expand_toggle"
                        @click.stop="toggleEventTags(yearGroup.dateGroups[0].events[0].id)"
                      >...</span>
                      <span class="tags_hover_list">
                        <span
                          v-for="tag in yearGroup.dateGroups[0].events[0].tags"
                          :key="tag.id"
                          class="event_tag_badge"
                          :style="getTagStyle(tag)"
                          :title="`Click to filter events by '${tag.name}'`"
                          @click.stop="handleTagClick(tag)"
                        >{{ tag.name }}</span>
                      </span>
                    </span>
                  </template>
                  <template v-if="location_show_details && canEditEvents">
                    {{ ' ' }}
                    <button 
                      class="event_inline_edit_btn" 
                      @click="edit_event_from_info(yearGroup.dateGroups[0].events[0].id)"
                      title="Edit event"
                    >
                      ✏️
                    </button>
                  </template>
                </span>
              </div>

              <!-- Multiple events in this year -->
              <template v-else>
                <!-- Year Header -->
                <div class="timeline_date_header">
                  <div class="timeline_bullet"></div>
                  <div class="timeline_date">{{ yearGroup.formattedYear }}</div>
                </div>

                <!-- Date subgroups within year -->
                <div class="timeline_events_list">
                  <template v-for="dateGroup in yearGroup.dateGroups" :key="dateGroup.date">
                    <template v-if="dateGroup.showDateHeader && dateGroup.events.length === 1">
                      <div class="timeline_event_line timeline_date_inline_event">
                        <span class="timeline_single_text">
                          <span class="timeline_date_inline_sub">{{ dateGroup.formattedDate }}</span>
                          {{ ' ' }}
                          <span class="event_icon">{{ get_event_emoji(dateGroup.events[0].lens_type, dateGroup.events[0].tags) }}</span>
                          {{ ' ' }}
                          <span 
                             class="event_name event_name_link"
                             @click="handle_show_detail(dateGroup.events[0])"
                          >{{ dateGroup.events[0].name }}</span>
                          <template v-if="!location_show_details && getKeyColorTags(dateGroup.events[0].tags).length > 0">
                            <span 
                              v-for="kt in getKeyColorTags(dateGroup.events[0].tags)" 
                              :key="'kc-' + kt.id"
                              class="key_color_dot"
                              :style="{ backgroundColor: kt.color }"
                              :title="kt.name"
                            ></span>
                          </template>
                          <template v-if="location_show_details && dateGroup.events[0].description">
                            <div class="event_description_text">{{ format_description_inline(dateGroup.events[0].description) }}</div>
                          </template>
                          <template v-if="location_show_details && dateGroup.events[0].tags && dateGroup.events[0].tags.length > 0">
                            {{ ' ' }}
                            <span class="tags_expand_wrapper" :class="{ 'expanded': isEventTagsExpanded(dateGroup.events[0].id) }" @mouseenter="onTagsHover(dateGroup.events[0].id)" @mouseleave="onTagsLeave(dateGroup.events[0].id)">
                              <span 
                                class="tags_expand_toggle"
                                @click.stop="toggleEventTags(dateGroup.events[0].id)"
                              >...</span>
                              <span class="tags_hover_list">
                                <span
                                  v-for="tag in dateGroup.events[0].tags"
                                  :key="tag.id"
                                  class="event_tag_badge"
                                  :style="getTagStyle(tag)"
                                  :title="`Click to filter events by '${tag.name}'`"
                                  @click.stop="handleTagClick(tag)"
                                >{{ tag.name }}</span>
                              </span>
                            </span>
                          </template>
                          <template v-if="location_show_details && canEditEvents">
                            {{ ' ' }}
                            <button 
                              class="event_inline_edit_btn" 
                              @click="edit_event_from_info(dateGroup.events[0].id)"
                              title="Edit event"
                            >
                              ✏️
                            </button>
                          </template>
                        </span>
                      </div>
                    </template>

                    <template v-else>
                      <div v-if="dateGroup.showDateHeader" class="timeline_date_subheader">
                        {{ dateGroup.formattedDate }}
                      </div>

                      <div 
                        v-for="event in dateGroup.events" 
                        :key="event.id"
                        class="timeline_event_line"
                        :class="{ 'timeline_event_line_indented': dateGroup.showDateHeader }"
                      >
                        <span class="timeline_single_text">
                          <span class="event_icon">{{ get_event_emoji(event.lens_type, event.tags) }}</span>
                          {{ ' ' }}
                          <span 
                             class="event_name event_name_link"
                             @click="handle_show_detail(event)"
                          >{{ event.name }}</span>
                          <template v-if="!location_show_details && getKeyColorTags(event.tags).length > 0">
                            <span 
                              v-for="kt in getKeyColorTags(event.tags)" 
                              :key="'kc-' + kt.id"
                              class="key_color_dot"
                              :style="{ backgroundColor: kt.color }"
                              :title="kt.name"
                            ></span>
                          </template>
                          <template v-if="location_show_details && event.description">
                            <div class="event_description_text">{{ format_description_inline(event.description) }}</div>
                          </template>
                          <template v-if="location_show_details && event.tags && event.tags.length > 0">
                            {{ ' ' }}
                            <span class="tags_expand_wrapper" :class="{ 'expanded': isEventTagsExpanded(event.id) }" @mouseenter="onTagsHover(event.id)" @mouseleave="onTagsLeave(event.id)">
                              <span 
                                class="tags_expand_toggle"
                                @click.stop="toggleEventTags(event.id)"
                              >...</span>
                              <span class="tags_hover_list">
                                <span
                                  v-for="tag in event.tags"
                                  :key="tag.id"
                                  class="event_tag_badge"
                                  :style="getTagStyle(tag)"
                                  :title="`Click to filter events by '${tag.name}'`"
                                  @click.stop="handleTagClick(tag)"
                                >{{ tag.name }}</span>
                              </span>
                            </span>
                          </template>
                          <template v-if="location_show_details && canEditEvents">
                            {{ ' ' }}
                            <button 
                              class="event_inline_edit_btn" 
                              @click="edit_event_from_info(event.id)"
                              title="Edit event"
                            >
                              ✏️
                            </button>
                          </template>
                        </span>
                      </div>
                    </template>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { useAuth } from '@/composables/useAuth.js'
import { useTags } from '@/composables/useTags.js'
import { useLocale } from '@/composables/useLocale.js'
import apiService from '@/services/api.js'
import { getEventEmoji, getAvailableLensTypes } from '@/utils/event-utils.js'
import { getContrastColor, getTagStyle, getKeyColorTags } from '@/utils/color-utils.js'
import EventForm from '@/components/events/EventForm.vue'

export default {
  name: 'WorldMap',
  components: {
    EventForm
  },
  setup() {
    const { canCreateEvents, canEditEvents, isGuest } = useAuth()
    const { allTags, loadTags } = useTags()
    const { formatEventDisplayDate, formatEventDisplaySmart, formatDayMonth, t } = useLocale()
    return {
      canCreateEvents,
      canEditEvents,
      isGuest,
      allTags,
      t,
      loadTags,
      formatEventDisplayDate,
      formatEventDisplaySmart,
      formatDayMonth
    }
  },
  props: {
    events: {
      type: Array,
      default: () => []
    },
    focusEvent: {
      type: Object,
      default: null
    },
    narrativeFlowEnabled: {
      type: Boolean,
      default: false
    },
    mapFilterEnabled: {
      type: Boolean,
      default: false
    },
    regions: {
      type: Array,
      default: () => []
    }
  },
  emits: ['event-created', 'event-updated', 'event-deleted', 'map-bounds-changed', 'tag-clicked', 'show-detail', 'back-to-location'],
  data() {
    return {
      map: null,
      markers: [],
      marker_cluster_group: null, // Marker cluster group for zoom-dependent clustering
      marker_registry: new Map(), // Map event IDs to markers for highlighting
      polyline_layers: [], // Store narrative flow polylines
      resize_observer: null,
      show_event_modal: false,
      show_event_info_modal: false,
      selected_events: [],
      location_events_backup: [],
      location_scroll_backup: 0,
      location_visible_count: 50,
      location_show_details: false,
      location_visible_count_backup: 50,
      highlight_overlay: null, // Store highlight overlay layer (halo ring + center dot)
      user_location_layer: null, // Store user location marker (geolocation feature)
      expanded_event_tags: {}, // Track which events have expanded tags
      editing_event: null, // Store the event being edited
      is_stepping: false, // Track if current update is from date stepping
      preserve_map_view: false, // Preserve current view after event edit/create/delete
      form_loading: false, // Track form submission loading state
      form_error: null, // Track form error message
      pin_mode: false, // Track if user is picking location from map
      new_event: {
        name: '',
        description: '',
        date: '', // Internal ISO format
        date_display: '', // Display format DD.MM.YYYY
        era: 'AD',
        latitude: 0,
        longitude: 0,
        lens_type: 'historic',
        source: '',
        dataset_id: null
      },
      datasets: [],
      region_layer_group: null
    }
  },
  watch: {
    events: {
      handler() {
        if (this.map) {
          this.add_event_markers()
          // Update narrative flow if enabled
          if (this.narrativeFlowEnabled) {
            this.render_narrative_flow()
          }
          // Reset flags after processing
          this.is_stepping = false
          this.preserve_map_view = false
        }
      },
      deep: true,
      immediate: false
    },
    focusEvent: {
      handler(new_focus_event) {
        if (new_focus_event && this.map) {
          this.center_on_event(new_focus_event)
        }
      },
      deep: true,
      immediate: false
    },
    // Update marker popups when authentication state changes
    canEditEvents: {
      handler() {
        if (this.map && this.markers.length > 0) {
          console.log('Auth state changed, updating popup content')
          this.update_marker_popups()
        }
      },
      immediate: false
    },
    // Handle narrative flow toggle
    narrativeFlowEnabled: {
      handler(enabled) {
        if (this.map) {
          if (enabled) {
            this.render_narrative_flow()
          } else {
            this.clear_narrative_flow()
          }
        }
      },
      immediate: false
    },
    regions: {
      handler(newRegions) {
        if (this.map) {
          this.render_regions(newRegions)
        }
      },
      deep: true,
      immediate: false
    }
  },
  
  computed: {
    grouped_events_by_year() {
      if (!this.selected_events || this.selected_events.length === 0) {
        return []
      }

      // Helper function for chronological sorting with BC/AD support
      const getChronologicalValue = (dateString, era) => {
        let year, month, day
        
        if (dateString.startsWith('-')) {
          // Negative year format: "-3501-01-01T00:00:00Z"
          const parts = dateString.substring(1).split('T')[0].split('-')
          year = parseInt(parts[0], 10)
          month = parseInt(parts[1], 10) - 1  // Month is 0-indexed
          day = parseInt(parts[2], 10)
        } else {
          // Positive year format: "1453-05-29T00:00:00Z"
          const parts = dateString.split('T')[0].split('-')
          year = parseInt(parts[0], 10)
          month = parseInt(parts[1], 10) - 1  // Month is 0-indexed
          day = parseInt(parts[2], 10)
        }
        
        if (era === 'BC') {
          // For BC: larger year number = older (3000 BC < 1000 BC)
          return -(year - (month / 12) - (day / 365))
        } else {
          // For AD: normal positive years
          return year + (month / 12) + (day / 365)
        }
      }

      const sortedEvents = [...this.selected_events].sort((a, b) => {
        const aValue = getChronologicalValue(a.event_date, a.era)
        const bValue = getChronologicalValue(b.event_date, b.era)
        return aValue - bValue
      })

      const getYearKey = (isoDateString, era) => {
        let year
        if (isoDateString.startsWith('-')) {
          year = parseInt(isoDateString.substring(1).split('T')[0].split('-')[0], 10)
        } else {
          year = parseInt(isoDateString.split('T')[0].split('-')[0], 10)
        }
        return `${year}_${era || 'AD'}`
      }

      const getFormattedYear = (isoDateString, era) => {
        let year
        if (isoDateString.startsWith('-')) {
          year = parseInt(isoDateString.substring(1).split('T')[0].split('-')[0], 10)
        } else {
          year = parseInt(isoDateString.split('T')[0].split('-')[0], 10)
        }
        if (era === 'BC') {
          return `${year} ${this.t('eraBC')}`
        }
        return `${year}`
      }

      const isJanFirst = (isoDateString) => {
        const datePart = isoDateString.startsWith('-')
          ? isoDateString.substring(1).split('T')[0]
          : isoDateString.split('T')[0]
        const parts = datePart.split('-')
        return parseInt(parts[1], 10) === 1 && parseInt(parts[2], 10) === 1
      }

      const yearGroups = new Map()
      sortedEvents.forEach(event => {
        const yearKey = getYearKey(event.event_date, event.era)
        if (!yearGroups.has(yearKey)) {
          yearGroups.set(yearKey, {
            yearKey,
            formattedYear: getFormattedYear(event.event_date, event.era),
            events: []
          })
        }
        yearGroups.get(yearKey).events.push(event)
      })

      return Array.from(yearGroups.values()).map(yg => {
        const dateMap = new Map()
        yg.events.forEach(event => {
          const eventDate = event.event_date.split('T')[0] + '_' + (event.era || 'AD')
          if (!dateMap.has(eventDate)) {
            dateMap.set(eventDate, {
              date: eventDate,
              formattedDate: this.formatDayMonth(event.event_date),
              isYearOnly: isJanFirst(event.event_date),
              events: []
            })
          }
          dateMap.get(eventDate).events.push({
            ...event,
            _formattedDate: this.formatEventDisplaySmart(event.event_date, event.era)
          })
        })

        const dateGroups = Array.from(dateMap.values())
        const hasSpecificDates = dateGroups.some(dg => !dg.isYearOnly)
        dateGroups.forEach(dg => {
          dg.showDateHeader = !dg.isYearOnly && (hasSpecificDates || dateGroups.length > 1)
        })

        return {
          yearKey: yg.yearKey,
          formattedYear: yg.formattedYear,
          totalEvents: yg.events.length,
          dateGroups
        }
      })
    },
    visible_grouped_events() {
      const groups = this.grouped_events_by_year
      let eventCount = 0
      const result = []
      
      for (const yearGroup of groups) {
        if (eventCount >= this.location_visible_count) break
        
        const remainingSlots = this.location_visible_count - eventCount
        if (yearGroup.totalEvents <= remainingSlots) {
          result.push(yearGroup)
          eventCount += yearGroup.totalEvents
        } else {
          const trimmedDateGroups = []
          let used = 0
          for (const dg of yearGroup.dateGroups) {
            if (used >= remainingSlots) break
            const slotsLeft = remainingSlots - used
            if (dg.events.length <= slotsLeft) {
              trimmedDateGroups.push(dg)
              used += dg.events.length
            } else {
              trimmedDateGroups.push({ ...dg, events: dg.events.slice(0, slotsLeft) })
              used += slotsLeft
              break
            }
          }
          result.push({ ...yearGroup, totalEvents: used, dateGroups: trimmedDateGroups })
          eventCount += used
          break
        }
      }
      
      return result
    },
    location_visible_event_count() {
      return this.visible_grouped_events.reduce((sum, yg) => sum + yg.totalEvents, 0)
    },
    location_total_event_count() {
      return this.selected_events?.length || 0
    },
    location_has_more_events() {
      return this.location_visible_event_count < this.location_total_event_count
    }
  },
  
  async mounted() {
    this.initialize_map()
    this.add_event_markers()
    
    // Only fetch datasets if user can edit events (editors/admins need datasets for event assignment)
    if (this.canEditEvents) {
      await this.fetchDatasets()
    }
    
    // Add resize observer to handle layout changes
    this.resize_observer = new ResizeObserver(() => {
      this.handle_resize()
    })
    this.resize_observer.observe(this.$refs.map)
    
    // Listen for window resize events (triggered by sidebar toggle)
    window.addEventListener('resize', this.handle_resize)
    
    // Listen for locale changes to refetch data
    this.handleLocaleChange = (event) => {
      console.log('Locale changed in WorldMap, refetching data for locale:', event.detail)
      // Emit event to parent (MapView) to refetch events with new locale
      this.$emit('locale-changed', event.detail)
    }
    window.addEventListener('localeChanged', this.handleLocaleChange)
  },
  
  beforeUnmount() {
    if (this.resize_observer) {
      this.resize_observer.disconnect()
    }
    window.removeEventListener('resize', this.handle_resize)
    
    // Remove locale change listener
    if (this.handleLocaleChange) {
      window.removeEventListener('localeChanged', this.handleLocaleChange)
    }
    
    // Clean up region layers
    this.clear_regions()

    // Clean up marker cluster group
    if (this.marker_cluster_group && this.map) {
      this.marker_cluster_group.clearLayers()
      this.map.removeLayer(this.marker_cluster_group)
      this.marker_cluster_group = null
    }
    
    // Clean up map instance
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    
    // Clear markers arrays
    this.markers = []
    this.marker_registry.clear()
  },
  methods: {
    initialize_map() {
      // Create map centered on world view
      this.map = L.map(this.$refs.map, {
        attributionControl: false
      }).setView([20, 0], 2)
      
      // Add OpenStreetMap tile layer — uses subdomain rotation for parallel loading
      // In dev: Vite proxies /tiles-a, /tiles-b, /tiles-c to respective OSM subdomains
      // In prod: Nginx proxies /tiles/ with upstream round-robin across a/b/c subdomains
      const tile_url = import.meta.env.DEV
        ? '/tiles-{s}/{z}/{x}/{y}.png'
        : '/tiles/{z}/{x}/{y}.png'
      L.tileLayer(tile_url, {
        maxZoom: 18,
        minZoom: 2,
        subdomains: 'abc'
      }).addTo(this.map)
      
      // Add click event for creating new events
      this.map.on('click', this.handle_map_click)

      // Add map bounds change listeners for the filter
      this.map.on('moveend', this.handle_bounds_change)
      this.map.on('zoomend', this.handle_bounds_change)
      
      // Fix for default marker icon in Leaflet with bundlers - use local assets
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/images/marker-icon-2x.png',
        iconUrl: '/images/marker-icon.png',
        shadowUrl: '/images/marker-shadow.png',
      })
    },
    
    handle_map_click(event) {
      const { lat, lng } = event.latlng
      
      // If in pin mode, update form coordinates, exit pin mode and show modal
      if (this.pin_mode) {
        this.new_event.latitude = lat
        this.new_event.longitude = lng
        this.exit_pin_mode_and_show_modal()
        return
      }
      
      // Check if user can create events
      if (!this.canCreateEvents) {
        return
      }

      // Check if any popup is currently open
      if (this.map._popup && this.map._popup._isOpen) {
        // If popup is open, close it instead of opening event creation
        this.map.closePopup()
        return
      }
      
      // Set coordinates for new event
      this.new_event.latitude = lat
      this.new_event.longitude = lng
      
      // Reset form fields
      this.new_event.name = ''
      this.new_event.description = ''
      this.new_event.name_en = ''
      this.new_event.name_ru = ''
      this.new_event.description_en = ''
      this.new_event.description_ru = ''
      this.new_event.date = ''
      this.new_event.date_display = ''
      this.new_event.era = 'AD'
      this.new_event.lens_type = 'historic'
      this.new_event.source = ''
      this.new_event.dataset_id = null
      
      // Show modal
      this.show_event_modal = true
    },
    
    toggle_pin_mode() {
      if (this.pin_mode) {
        this.exit_pin_mode()
      } else {
        this.enter_pin_mode()
      }
    },
    
    enter_pin_mode() {
      this.pin_mode = true
      // Hide modal while picking location (but keep editing state)
      this.show_event_modal = false
      // Change cursor to crosshair
      if (this.map) {
        this.map.getContainer().style.cursor = 'crosshair'
      }
      // Add right-click handler to exit
      if (this.map) {
        this.map.on('contextmenu', this.exit_pin_mode_and_show_modal)
      }
      // Add escape key handler
      document.addEventListener('keydown', this.handle_pin_mode_keydown)
    },
    
    exit_pin_mode() {
      this.pin_mode = false
      // Restore cursor
      if (this.map) {
        this.map.getContainer().style.cursor = ''
      }
      // Remove right-click handler
      if (this.map) {
        this.map.off('contextmenu', this.exit_pin_mode_and_show_modal)
      }
      // Remove escape key handler
      document.removeEventListener('keydown', this.handle_pin_mode_keydown)
    },
    
    exit_pin_mode_and_show_modal() {
      this.exit_pin_mode()
      // Show modal again after exiting pin mode
      this.show_event_modal = true
    },
    
    handle_pin_mode_keydown(event) {
      if (event.key === 'Escape') {
        this.exit_pin_mode_and_show_modal()
      }
    },

    // Get current map bounds
    getCurrentBounds() {
      if (!this.map) {
        return Promise.resolve(null)
      }
      
      const bounds = this.map.getBounds()
      return Promise.resolve({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      })
    },

    // Highlight a marker without refocusing the map
    highlightMarker(event) {
      // Clear any existing highlight overlay
      if (this.highlight_overlay) {
        this.map.removeLayer(this.highlight_overlay)
        this.highlight_overlay = null
      }

      // Find the marker for this event
      const marker = this.marker_registry.get(event.id)
      if (!marker) {
        console.warn('No marker found for event:', event.id)
        return
      }

      // Get marker position and check if it's in current map bounds
      const markerLatLng = marker.getLatLng()
      const bounds = this.map.getBounds()
      const isInBounds = bounds.contains(markerLatLng)

      // Create a static halo ring around the marker
      // Outer ring: semi-transparent red circle
      const outerRing = L.circleMarker(markerLatLng, {
        radius: 28,
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#ef4444', // Red color
        weight: 5,
        opacity: 0.8
      })

      // Center dot: small solid dot for precision
      const centerDot = L.circleMarker(markerLatLng, {
        radius: 3,
        fillColor: '#ef4444',
        fillOpacity: 1,
        color: '#dc2626',
        weight: 1,
        opacity: 1
      })

      // Create a layer group with both elements
      this.highlight_overlay = L.layerGroup([outerRing, centerDot])
      this.highlight_overlay.addTo(this.map)

    },

    // Clear highlight overlay
    clearHighlight() {
      if (this.highlight_overlay && this.map) {
        this.map.removeLayer(this.highlight_overlay)
        this.highlight_overlay = null
      }
    },

    // Center map on specific coordinates (used for geolocation)
    centerOnCoordinates(lat, lng, zoom = 12) {
      if (!this.map) {
        console.warn('Map not initialized')
        return
      }
      this.map.setView([lat, lng], zoom, { animate: true })
      // Render user location marker
      this.renderUserLocation(lat, lng)
    },

    // Get current map center and zoom (for URL sharing)
    getMapState() {
      if (!this.map) {
        return null
      }
      const center = this.map.getCenter()
      return {
        lat: center.lat,
        lng: center.lng,
        zoom: this.map.getZoom()
      }
    },

    // Set map center and zoom (for URL restoration)
    setMapState(lat, lng, zoom) {
      if (!this.map) {
        console.warn('Map not initialized')
        return
      }
      this.map.setView([lat, lng], zoom, { animate: false })
    },

    // Preserve current map view (prevents auto-refocus when events change)
    preserveCurrentView() {
      this.preserve_map_view = true
    },

    // Render user location marker on the map
    renderUserLocation(lat, lng) {
      // Clear any existing user location marker
      this.clearUserLocation()

      const userLatLng = [lat, lng]

      // Outer pulsing ring (larger, semi-transparent blue)
      const outerRing = L.circleMarker(userLatLng, {
        radius: 24,
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#4f46e5',
        weight: 4,
        opacity: 0.7
      })

      // Middle ring for visual depth
      const middleRing = L.circleMarker(userLatLng, {
        radius: 16,
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#818cf8',
        weight: 2,
        opacity: 0.5
      })

      // Center dot - solid indigo circle indicating exact position
      const centerDot = L.circleMarker(userLatLng, {
        radius: 8,
        fillColor: '#4f46e5',
        fillOpacity: 1,
        color: '#3730a3',
        weight: 2,
        opacity: 1
      })

      // Inner white dot for contrast
      const innerDot = L.circleMarker(userLatLng, {
        radius: 3,
        fillColor: '#ffffff',
        fillOpacity: 1,
        color: '#ffffff',
        weight: 0,
        opacity: 1
      })

      // Create a layer group with all elements
      this.user_location_layer = L.layerGroup([outerRing, middleRing, centerDot, innerDot])
      this.user_location_layer.addTo(this.map)
    },

    // Clear user location marker from the map
    clearUserLocation() {
      if (this.user_location_layer && this.map) {
        this.map.removeLayer(this.user_location_layer)
        this.user_location_layer = null
      }
    },

    // Handle map bounds changes
    handle_bounds_change() {
      if (!this.map) return
      
      const bounds = this.map.getBounds()
      const boundsData = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }
      
      this.$emit('map-bounds-changed', boundsData)
      this._update_region_label_sizes()
    },

    edit_event(eventId) {
      // Find the event to edit
      const event = this.events.find(e => e.id === eventId)
      if (!event) {
        console.error('Event not found:', eventId)
        return
      }

      // Set editing mode
      this.editing_event = event
      
      // Populate form with event data including locale-specific fields
      this.new_event.name = event.name
      this.new_event.description = event.description
      this.new_event.name_en = event.name_en || event.name || ''
      this.new_event.name_ru = event.name_ru || event.name || ''
      this.new_event.description_en = event.description_en || event.description || ''
      this.new_event.description_ru = event.description_ru || event.description || ''
      this.new_event.latitude = event.latitude
      this.new_event.longitude = event.longitude
      this.new_event.era = event.era || 'AD'
      this.new_event.lens_type = event.lens_type
      this.new_event.source = event.source || ''
      this.new_event.dataset_id = event.dataset_id || null
      
      // Handle date formatting
      this.new_event.date = event.event_date.split('T')[0]
      this.new_event.date_display = this.format_date(event.event_date)
      
      // Show modal
      this.show_event_modal = true
    },
    
    add_event_markers() {      
      // Clear existing markers first - more robust cleanup
      if (this.marker_cluster_group) {
        // Clear all layers from the cluster group
        this.marker_cluster_group.clearLayers()
        // Remove from map if present
        if (this.map && this.map.hasLayer(this.marker_cluster_group)) {
          this.map.removeLayer(this.marker_cluster_group)
        }
        this.marker_cluster_group = null
      }
      this.markers = []
      this.marker_registry.clear() // Clear marker registry
      
      // Wait for next tick to ensure map is ready
      this.$nextTick(() => {
        // Double-check map state before proceeding
        if (!this.map || !this.map._loaded) {
          console.warn('Map not ready for marker addition')
          return
        }
        
        // Double-check and clean up any stale marker cluster group from a race condition
        if (this.marker_cluster_group) {
          this.marker_cluster_group.clearLayers()
          if (this.map.hasLayer(this.marker_cluster_group)) {
            this.map.removeLayer(this.marker_cluster_group)
          }
          this.marker_cluster_group = null
        }
        
        try {
          // Create a new marker cluster group with custom options
          this.marker_cluster_group = L.markerClusterGroup({
            // Max cluster radius - how close markers need to be to cluster together
            maxClusterRadius: 80,
            // Show coverage on hover
            showCoverageOnHover: false,
            // Don't zoom on cluster click - we'll show modal instead
            zoomToBoundsOnClick: false,
            // Disable clustering at max zoom to show individual pins
            disableClusteringAtZoom: 18,
            // Don't spiderfy - we show modal instead
            spiderfyOnMaxZoom: false,
            // Custom icon creation for clusters - use circles sized by event count
            iconCreateFunction: (cluster) => {
              const childMarkers = cluster.getAllChildMarkers()
              
              let totalEventCount = 0
              childMarkers.forEach(marker => {
                totalEventCount += marker.eventCount || 1
              })
              
              const currentZoom = this.map ? this.map.getZoom() : 10
              
              if (currentZoom >= 15 && childMarkers.length === 1) {
                const displayCount = totalEventCount > 99 ? '99+' : totalEventCount
                const childEvents = childMarkers[0].events || []
                const clusterEmoji = this.get_tag_emoji(childEvents) || getEventEmoji(childEvents[0]?.lens_type || 'historic')
                return L.divIcon({
                  html: `<div class="emoji-marker cluster-marker" data-lens="cluster">
                           ${clusterEmoji}
                           <span class="marker-count-badge">${displayCount}</span>
                         </div>`,
                  className: 'emoji-marker-container',
                  iconSize: [30, 30],
                  iconAnchor: [15, 30],
                  popupAnchor: [0, -30]
                })
              }
              
              let circleSize, fontSize
              if (totalEventCount > 200) {
                circleSize = 54
                fontSize = 15
              } else if (totalEventCount > 100) {
                circleSize = 48
                fontSize = 14
              } else if (totalEventCount > 50) {
                circleSize = 42
                fontSize = 13
              } else if (totalEventCount > 20) {
                circleSize = 36
                fontSize = 12
              } else if (totalEventCount >= 10) {
                circleSize = 30
                fontSize = 11
              } else {
                circleSize = 26
                fontSize = 10
              }
              
              let displayCount
              if (totalEventCount > 999) {
                displayCount = Math.round(totalEventCount / 1000) + 'k'
              } else {
                displayCount = totalEventCount
              }
              
              const halfSize = circleSize / 2

              const colorCounts = {}
              let taggedCount = 0
              childMarkers.forEach(marker => {
                const events = marker.events || []
                events.forEach(event => {
                  const keyTags = getKeyColorTags(event.tags)
                  if (keyTags.length > 0) {
                    taggedCount++
                    keyTags.forEach(tag => {
                      const color = tag.color || '#4f46e5'
                      colorCounts[color] = (colorCounts[color] || 0) + 1
                    })
                  }
                })
              })

              let bgStyle
              const colorEntries = Object.entries(colorCounts)
              if (colorEntries.length === 0) {
                bgStyle = 'linear-gradient(135deg, #4f46e5 0%, #4f46e5 100%)'
              } else {
                const totalWeight = colorEntries.reduce((sum, [, count]) => sum + count, 0)
                const untaggedCount = totalEventCount - taggedCount
                const segments = []
                let angle = 0

                colorEntries.sort((a, b) => b[1] - a[1])

                colorEntries.forEach(([color, count]) => {
                  const share = count / (totalWeight + (untaggedCount > 0 ? untaggedCount : 0)) * 360
                  segments.push(`${color} ${angle}deg ${angle + share}deg`)
                  angle += share
                })

                if (untaggedCount > 0) {
                  segments.push(`#4f46e5 ${angle}deg 360deg`)
                }

                bgStyle = `conic-gradient(${segments.join(', ')})`
              }
              
              const circleStyles = `
                width: ${circleSize}px;
                height: ${circleSize}px;
                font-size: ${fontSize}px;
                background: ${bgStyle};
                border: 3px solid rgba(255, 255, 255, 0.95);
                border-radius: 50%;
                color: white;
                font-weight: 700;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(0, 0, 0, 0.25);
                cursor: pointer;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
              `.replace(/\s+/g, ' ').trim()
              
              return L.divIcon({
                html: `<div style="${circleStyles}">${displayCount}</div>`,
                className: 'cluster-circle-container',
                iconSize: [circleSize, circleSize],
                iconAnchor: [halfSize, halfSize],
                popupAnchor: [0, -halfSize]
              })
            }
          })
          
          // Add click handler to clusters to show event info modal
          this.marker_cluster_group.on('clusterclick', (cluster) => {
            // If in pin mode, use cluster location for coordinates
            if (this.pin_mode) {
              const clusterLatLng = cluster.layer.getLatLng()
              this.new_event.latitude = clusterLatLng.lat
              this.new_event.longitude = clusterLatLng.lng
              this.exit_pin_mode_and_show_modal()
              return
            }
            
            // Get all markers in the cluster
            const markers = cluster.layer.getAllChildMarkers()
            
            // Extract events from markers - each marker stores its events directly
            const clusterEvents = []
            markers.forEach(marker => {
              // Each marker has an events property we set below
              if (marker.events && Array.isArray(marker.events)) {
                marker.events.forEach(event => {
                  // Avoid duplicates
                  if (!clusterEvents.find(e => e.id === event.id)) {
                    clusterEvents.push(event)
                  }
                })
              }
            })
            
            // Show modal with all events from this cluster
            if (clusterEvents.length > 0) {
              this.show_events_info(clusterEvents)
            }
          })
          
          // Group events by location (same coordinates)
          const locationGroups = this.group_events_by_location(this.events)
          
          // Build all markers first, then batch-add — avoids O(n²) clustering recalculation
          const markersToAdd = []

          Object.values(locationGroups).forEach(eventGroup => {
            if (!eventGroup.latitude || !eventGroup.longitude || !this.map) return
            
            const lat = parseFloat(eventGroup.latitude)
            const lng = parseFloat(eventGroup.longitude)
            
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
              console.warn('Invalid coordinates:', lat, lng)
              return
            }
            
            const is_multi = eventGroup.events.length > 1
            const tag_emoji = is_multi ? null : this.get_tag_emoji(eventGroup.events)
            const emoji_icon = this.create_emoji_marker_icon(
              is_multi ? 'multiple' : eventGroup.events[0].lens_type,
              eventGroup.events.length,
              tag_emoji
            )
            
            const marker = L.marker([lat, lng], { 
              icon: emoji_icon,
              riseOnHover: true
            })
            
            marker.eventCount = eventGroup.events.length
            marker.events = eventGroup.events
            
            marker.on('click', () => {
              if (this.pin_mode) {
                const markerLatLng = marker.getLatLng()
                this.new_event.latitude = markerLatLng.lat
                this.new_event.longitude = markerLatLng.lng
                this.exit_pin_mode_and_show_modal()
                return
              }
              this.show_events_info(eventGroup.events)
            })
            
            eventGroup.events.forEach(event => {
              this.marker_registry.set(event.id, marker)
            })
            
            markersToAdd.push(marker)
            this.markers.push(marker)
          })
          
          // Single batch insert — clustering runs once, not once per marker
          this.marker_cluster_group.addLayers(markersToAdd)
          this.map.addLayer(this.marker_cluster_group)
        } catch (error) {
          console.error('Error adding markers:', error)
        }
        
        // Invalidate map size to ensure proper rendering
        if (this.map) {
          setTimeout(() => {
            this.map.invalidateSize(true)
          }, 100)
        }
      })
    },

    
    fit_map_to_events() {
      // Add comprehensive checks to prevent Leaflet errors
      if (!this.map || !this.map._loaded || !this.events || this.events.length === 0) {
        return
      }
      
      // Wait for next tick to ensure map is fully rendered
      this.$nextTick(() => {
        try {
          // If only one event, center on it with reasonable zoom
          if (this.events.length === 1) {
            const event = this.events[0]
            if (event.latitude != null && event.longitude != null) {
              this.map.setView([event.latitude, event.longitude], 6)
            }
            return
          }
          
          // For multiple events, calculate bounds
          const lats = this.events.map(event => event.latitude).filter(lat => lat != null && !isNaN(lat))
          const lngs = this.events.map(event => event.longitude).filter(lng => lng != null && !isNaN(lng))
          
          if (lats.length === 0 || lngs.length === 0) {
            return
          }
          
          const minLat = Math.min(...lats)
          const maxLat = Math.max(...lats)
          const minLng = Math.min(...lngs)
          const maxLng = Math.max(...lngs)
          
          // Ensure bounds are valid
          if (minLat === maxLat && minLng === maxLng) {
            // Single point, just center on it
            this.map.setView([minLat, minLng], 6)
            return
          }
          
          // Create bounds with some padding
          const bounds = [
            [minLat, minLng],
            [maxLat, maxLng]
          ]
          
          // Fit the map to show all events with padding
          this.map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 8 // Don't zoom in too much for close events
          })
        } catch (error) {
          console.warn('Error fitting map to events:', error)
          // Fallback to world view if there's an error
          this.map.setView([20, 0], 2)
        }
      })
    },
    
    center_on_event(event) {
      if (!this.map || !event.latitude || !event.longitude) {
        return
      }
      
      try {
        this.map.setView([event.latitude, event.longitude], this.map.getZoom(), {
          animate: false
        })
        
        // Add highlight marker (same as "Highlight on map" feature)
        this.highlightMarker(event)
      } catch (error) {
        console.warn('Error centering on event:', error)
      }
    },
    
    handle_resize() {
      if (this.map) {
        // Small delay to ensure DOM has updated
        this.$nextTick(() => {
          try {
            this.map.invalidateSize()
            // Force a redraw to prevent rendering issues
            setTimeout(() => {
              if (this.map) {
                this.map.invalidateSize()
              }
            }, 100)
          } catch (error) {
            console.warn('Error resizing map:', error)
          }
        })
      }
    },
    
    async handle_form_submit(eventData) {
      this.form_loading = true
      this.form_error = null
      
      try {
        const tag_ids = eventData.tag_ids || []
        delete eventData.tag_ids
        
        let response
        if (this.editing_event) {
          response = await apiService.updateEvent(this.editing_event.id, eventData)
          
          if (tag_ids.length > 0 || (this.editing_event.tags && this.editing_event.tags.length > 0)) {
            await apiService.setEventTags(this.editing_event.id, tag_ids)
          }
          
          // Fetch fresh event with tags included
          const freshEvent = await apiService.getEventById(this.editing_event.id)
          
          console.log('Event updated successfully:', freshEvent)
          // Preserve current map view when events are refreshed
          this.preserve_map_view = true
          this.$emit('event-updated', freshEvent)
        } else {
          response = await apiService.createEvent(eventData)
          
          if (tag_ids.length > 0) {
            await apiService.setEventTags(response.id, tag_ids)
          }
          
          // Fetch fresh event with tags included
          const freshEvent = await apiService.getEventById(response.id)
          
          console.log('Event created successfully:', freshEvent)
          // Preserve current map view when events are refreshed
          this.preserve_map_view = true
          this.$emit('event-created', freshEvent)
        }
        
        this.close_modal()
        
      } catch (error) {
        console.error('Error saving event:', error)
        if (error.message && error.message.includes('401')) {
          this.form_error = 'Authentication failed. Please log in again.'
        } else {
          const action = this.editing_event ? 'update' : 'create'
          this.form_error = `Failed to ${action} event. Please try again.`
        }
      } finally {
        this.form_loading = false
      }
    },

    async delete_event() {
      if (!this.editing_event) return
      
      const confirmed = confirm(`Are you sure you want to delete "${this.editing_event.name}"? This action cannot be undone.`)
      if (!confirmed) return
      
      try {
        await apiService.deleteEvent(this.editing_event.id)
        console.log('Event deleted successfully')
        
        // Preserve current map view when events are refreshed
        this.preserve_map_view = true
        
        // Emit event to parent component to refresh events list
        this.$emit('event-deleted', this.editing_event.id)
        
        // Close modal
        this.close_modal()
        
      } catch (error) {
        console.error('Error deleting event:', error)
        if (error.message.includes('401')) {
          alert('Authentication failed. Please log in again.')
        } else {
          alert('Failed to delete event. Please try again.')
        }
      }
    },
    
    close_modal() {
      this.show_event_modal = false
      this.editing_event = null
      this.form_loading = false
      this.form_error = null
      
      // Exit pin mode if active
      if (this.pin_mode) {
        this.exit_pin_mode()
      }
      
      // Reset form coordinates
      this.new_event = {
        latitude: 0,
        longitude: 0
      }
    },

    async fetchDatasets() {
      try {
        const response = await apiService.getDatasets()
        this.datasets = Array.isArray(response) ? response.filter(d => d && d.id) : []
        console.log('Loaded datasets for event form:', this.datasets.length)
      } catch (err) {
        console.error('Error fetching datasets:', err)
        this.datasets = []
      }
    },
    
    get_backend_url() {
      // Use relative URL - Vite proxy or nginx will route to backend
      return '/api'
    },
    
    format_description_inline(text) {
      if (!text) return ''
      return text.trim()
    },

    format_date(date_string) {
      // For very old dates, parse manually to avoid Date object issues
      if (date_string.startsWith('00') || date_string.startsWith('01')) {
        return this.format_date_to_ddmmyyyy(date_string)
      }
      return this.format_date_to_ddmmyyyy(new Date(date_string))
    },

    get_event_emoji(lensType, tags) {
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (tag.emoji) return tag.emoji
        }
      }
      return getEventEmoji(lensType)
    },

    getAvailableLensTypes() {
      return getAvailableLensTypes()
    },
    
    format_date_to_ddmmyyyy(date) {
      // Handle both Date objects and ISO strings
      let day, month, year
      
      if (typeof date === 'string') {
        // Parse ISO string manually for very old dates
        const [year_str, month_str, day_str] = date.split('-')
        day = parseInt(day_str, 10)
        month = parseInt(month_str, 10) 
        year = parseInt(year_str, 10)
      } else {
        // Regular Date object
        day = date.getDate()
        month = date.getMonth() + 1
        year = date.getFullYear()
      }
      
      const padded_day = String(day).padStart(2, '0')
      const padded_month = String(month).padStart(2, '0')
      
      return `${padded_day}.${padded_month}.${year}`
    },
    
    parse_ddmmyyyy_to_iso(dateStr) {
      // Allow years from 1-4 digits (year 1 to 9999)
      if (!dateStr || !dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{1,4}$/)) {
        return null
      }
      const [day, month, year] = dateStr.split('.')
      const year_num = parseInt(year, 10)
      const month_num = parseInt(month, 10)
      const day_num = parseInt(day, 10)
      
      // Basic validation
      if (year_num < 1 || year_num > 9999) return null
      if (month_num < 1 || month_num > 12) return null
      if (day_num < 1 || day_num > 31) return null
      
      // For very old years, construct ISO string manually to avoid Date object issues
      const padded_year = String(year_num).padStart(4, '0')
      const padded_month = String(month_num).padStart(2, '0')
      const padded_day = String(day_num).padStart(2, '0')
      
      return `${padded_year}-${padded_month}-${padded_day}`
    },
    
    update_event_date() {
      const iso_date = this.parse_ddmmyyyy_to_iso(this.new_event.date_display)
      if (iso_date) {
        this.new_event.date = iso_date
      } else {
        // Clear if invalid
        this.new_event.date_display = ''
        this.new_event.date = ''
      }
    },
    
    get_tag_emoji(events) {
      for (const event of events) {
        if (event.tags && Array.isArray(event.tags)) {
          for (const tag of event.tags) {
            if (tag.emoji) return tag.emoji
          }
        }
      }
      return null
    },

    create_emoji_marker_icon(lens_type, eventCount = 1, tag_emoji = null) {
      const emoji = tag_emoji || getEventEmoji(lens_type)
      
      const countBadge = eventCount > 1 ? `<span class="marker-count-badge">${eventCount}</span>` : ''
      
      return L.divIcon({
        html: `<div class="emoji-marker" data-lens="${lens_type}">${emoji}${countBadge}</div>`,
        className: 'emoji-marker-container',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
        bgPos: [15, 30]
      })
    },

    group_events_by_location(events) {
      const groups = {}
      const tolerance = 0.0001 // Small tolerance for coordinate matching
      
      events.forEach(event => {
        if (!event.latitude || !event.longitude) return
        
        // Create a location key with rounded coordinates
        const lat = Math.round(event.latitude / tolerance) * tolerance
        const lng = Math.round(event.longitude / tolerance) * tolerance
        const locationKey = `${lat},${lng}`
        
        if (!groups[locationKey]) {
          groups[locationKey] = {
            latitude: event.latitude,
            longitude: event.longitude,
            events: []
          }
        }
        
        groups[locationKey].events.push(event)
      })
      
      return groups
    },


    // Method to set stepping mode from parent component
    setSteppingMode(isStepping) {
      this.is_stepping = isStepping
    },

    // Show events info in custom modal (no coordinate corruption)
    show_events_info(events) {
      // Ensure tags are loaded first
      if (this.allTags.length === 0) {
        this.loadTags()
      }
      
      // Enrich events with their tag information
      const enrichedEvents = events.map(event => ({
        ...event,
        tags: event.tags || [] // Ensure tags array exists
      }))
      
      // Single event: use unified detail modal
      if (enrichedEvents.length === 1) {
        this.$emit('show-detail', enrichedEvents[0])
        return
      }
      
      // Multiple events: show location modal
      this.selected_events = enrichedEvents
      this.show_event_info_modal = true
    },

    // Close event info modal
    close_event_info_modal() {
      this.show_event_info_modal = false
      this.selected_events = []
      this.expanded_event_tags = {}
      this.location_visible_count = 50
    },
    handle_location_scroll(e) {
      const container = e.target
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      if (scrollBottom < 100 && this.location_has_more_events) {
        this.location_visible_count += 50
      }
    },
    toggle_location_details() {
      const container = this.$refs.locationModalContent
      if (!container) {
        this.location_show_details = !this.location_show_details
        return
      }
      const containerRect = container.getBoundingClientRect()
      const groups = container.querySelectorAll('.timeline_year_group[data-year-key]')
      let anchor = null
      for (const el of groups) {
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top
        if (relativeTop <= 20) {
          anchor = { key: el.dataset.yearKey, relativeTop }
        } else {
          if (!anchor) anchor = { key: el.dataset.yearKey, relativeTop }
          break
        }
      }
      this.location_show_details = !this.location_show_details
      this.$nextTick(() => {
        if (anchor) {
          const el = container.querySelector(`.timeline_year_group[data-year-key="${anchor.key}"]`)
          if (el) {
            const newRect = el.getBoundingClientRect()
            const newRelativeTop = newRect.top - containerRect.top
            container.scrollTop += newRelativeTop - anchor.relativeTop
          }
        }
      })
    },

    // Create new event at the same location as viewed events
    create_event_at_location() {
      if (this.selected_events.length === 0) return
      
      // Get coordinates from the first event in the list
      const { latitude, longitude } = this.selected_events[0]
      
      // Close the info modal
      this.close_event_info_modal()
      
      // Open event creation modal with pre-filled coordinates
      this.new_event = {
        name: '',
        description: '',
        name_en: '',
        name_ru: '',
        description_en: '',
        description_ru: '',
        date: '',
        date_display: '',
        era: 'AD',
        latitude: latitude,
        longitude: longitude,
        source: '',
        lens_type: 'historic',
        dataset_id: null
      }
      this.editing_event = null
      this.show_event_modal = true
    },

    // Edit event from info modal
    edit_event_from_info(eventId) {
      this.close_event_info_modal()
      this.edit_event(eventId)
    },

    // Expandable tags functionality for event modal
    getVisibleTags(event) {
      if (!event.tags || event.tags.length === 0) return []
      if (this.isEventTagsExpanded(event.id)) {
        return event.tags
      }
      return event.tags.slice(0, 3)
    },

    isEventTagsExpanded(eventId) {
      return this.expanded_event_tags[eventId] === true
    },

    toggleEventTags(eventId) {
      this.expanded_event_tags = {
        ...this.expanded_event_tags,
        [eventId]: !this.expanded_event_tags[eventId]
      }
    },

    onTagsHover(eventId) {
      if (this.expanded_event_tags[eventId]) return
      if (!this._hover_timers) this._hover_timers = {}
      this._hover_timers[eventId] = setTimeout(() => {
        this.expanded_event_tags = {
          ...this.expanded_event_tags,
          [eventId]: true
        }
      }, 500)
    },

    onTagsLeave(eventId) {
      if (this._hover_timers && this._hover_timers[eventId]) {
        clearTimeout(this._hover_timers[eventId])
        delete this._hover_timers[eventId]
      }
    },

    getHiddenTagNames(event) {
      if (!event.tags || event.tags.length <= 3) return ''
      return event.tags.slice(3).map(tag => tag.name).join(', ')
    },

    // Handle tag click to add to filter panel
    handleTagClick(tag) {
      this.$emit('tag-clicked', tag)
      // Close the modal after clicking a tag for immediate visual feedback
      this.close_event_info_modal()
    },
    handle_show_detail(event) {
      this.location_events_backup = [...this.selected_events]
      if (this.$refs.locationModalContent) {
        this.location_scroll_backup = this.$refs.locationModalContent.scrollTop
      }
      this.location_visible_count_backup = this.location_visible_count
      this.$emit('show-detail', { event, source: 'location' })
      this.show_event_info_modal = false
      this.selected_events = []
      this.expanded_event_tags = {}
    },
    restore_location_modal() {
      if (this.location_events_backup && this.location_events_backup.length > 0) {
        this.selected_events = this.location_events_backup
        this.location_visible_count = this.location_visible_count_backup
        this.show_event_info_modal = true
        this.$nextTick(() => {
          if (this.$refs.locationModalContent && this.location_scroll_backup > 0) {
            this.$refs.locationModalContent.scrollTop = this.location_scroll_backup
          }
        })
      }
    },

    getContrastColor,
    getTagStyle,
    getKeyColorTags,
    
    // Render narrative flow polylines connecting events chronologically
    render_narrative_flow() {
      // Clear existing polylines first
      this.clear_narrative_flow()
      
      if (!this.events || this.events.length < 2) {
        return // Need at least 2 events to draw connections
      }
      
      // Sort events chronologically using the same logic as useEvents
      const getChronologicalValue = (event) => {
        let year, month, day
        const dateString = event.event_date
        const era = event.era
        
        if (dateString.startsWith('-')) {
          // Negative year format: "-3501-01-01T00:00:00Z" 
          const parts = dateString.substring(1).split('T')[0].split('-')
          year = parseInt(parts[0], 10)
          month = parseInt(parts[1], 10) - 1  // Month is 0-indexed
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
          return -(year - (month / 12) - (day / 365))
        } else {
          // For AD: normal positive years
          return year + (month / 12) + (day / 365)
        }
      }
      
      const sorted_events = [...this.events].sort((a, b) => {
        const aValue = getChronologicalValue(a)
        const bValue = getChronologicalValue(b)
        return aValue - bValue // Chronological order: older events first
      })
      
      // Generate polyline coordinates, skipping co-located events
      const polyline_points = []
      let last_location = null
      
      for (const event of sorted_events) {
        const current_location = [event.latitude, event.longitude]
        
        // Only add point if it's different from the last location
        if (!last_location || 
            last_location[0] !== current_location[0] || 
            last_location[1] !== current_location[1]) {
          polyline_points.push(current_location)
          last_location = current_location
        }
      }
      
      // Need at least 2 different locations to draw a line
      if (polyline_points.length < 2) {
        return
      }
      
      // Helper function to interpolate between two colors
      const interpolateColor = (color1, color2, factor) => {
        // Parse hex colors
        const r1 = parseInt(color1.substring(1, 3), 16)
        const g1 = parseInt(color1.substring(3, 5), 16)
        const b1 = parseInt(color1.substring(5, 7), 16)
        const r2 = parseInt(color2.substring(1, 3), 16)
        const g2 = parseInt(color2.substring(3, 5), 16)
        const b2 = parseInt(color2.substring(5, 7), 16)
        
        // Interpolate
        const r = Math.round(r1 + (r2 - r1) * factor)
        const g = Math.round(g1 + (g2 - g1) * factor)
        const b = Math.round(b1 + (b2 - b1) * factor)
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }
      
      // Create polyline segments with gradient color (dark blue to light blue)
      const start_color = '#3730a3' // Dark indigo (older events)
      const end_color = '#93c5fd'   // Light blue (newer events)
      const line_length = polyline_points.length
      
      for (let i = 0; i < line_length - 1; i++) {
        const start = polyline_points[i]
        const end = polyline_points[i + 1]
        
        // Calculate color for this segment based on position in sequence
        const progress = i / (line_length - 1)
        const segment_color = interpolateColor(start_color, end_color, progress)
        
        // Create individual polyline segment with gradient color
        const segment = L.polyline([start, end], {
          color: segment_color,
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5',
          lineJoin: 'round'
        })
        
        segment.addTo(this.map)
        this.polyline_layers.push(segment)
        
        // Calculate midpoint for arrow placement
        const mid_lat = (start[0] + end[0]) / 2
        const mid_lng = (start[1] + end[1]) / 2
        
        // Calculate rotation angle (atan2(Δlat, Δlng) gives counterclockwise, negate and add 180° to flip)
        const delta_lat = end[0] - start[0]
        const delta_lng = end[1] - start[1]
        const angle = -Math.atan2(delta_lat, delta_lng) * 180 / Math.PI + 180
        
        // Create arrow marker with matching color
        const arrow_marker = L.marker([mid_lat, mid_lng], {
          icon: L.divIcon({
            html: `<div style="transform: rotate(${angle}deg); width: 20px; height: 20px;">
                     <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                       <path d="M0 10 L10 5 L10 15 Z" fill="${segment_color}" opacity="0.9"/>
                     </svg>
                   </div>`,
            className: 'narrative-flow-arrow',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          }),
          interactive: false
        })
        
        arrow_marker.addTo(this.map)
        this.polyline_layers.push(arrow_marker)
      }
    },
    
    // Clear all narrative flow polylines from map
    clear_narrative_flow() {
      this.polyline_layers.forEach(layer => {
        this.map.removeLayer(layer)
      })
      this.polyline_layers = []
    },

    render_regions(regions) {
      this.clear_regions()

      if (!regions || regions.length === 0) return

      this.region_layer_group = L.layerGroup()
      this._region_label_data = []

      regions.forEach(region => {
        if (!region.geojson) return

        try {
          const geojsonData = typeof region.geojson === 'string' ? JSON.parse(region.geojson) : region.geojson

          const border_color = region.border_color || region.color || '#4f46e5'

          const layer = L.geoJSON(geojsonData, {
            style: () => ({
              color: border_color,
              weight: region.border_width || 2,
              fillColor: region.color || '#4f46e5',
              fillOpacity: region.fill_opacity != null ? region.fill_opacity : 0.2,
              opacity: 0.8,
              interactive: false
            })
          })

          this.region_layer_group.addLayer(layer)

          const name = region.name || ''
          if (name && layer.getBounds) {
            const coords = this._extract_polygon_coords(geojsonData)
            const angle = this._compute_principal_angle(coords)
            const bounds = layer.getBounds()
            const center = bounds.getCenter()

            const label_id = 'region-lbl-' + region.id
            const label_marker = L.marker(center, {
              interactive: false,
              icon: L.divIcon({
                className: 'region-label',
                html: `<span id="${label_id}" style="color: ${border_color};">${name}</span>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
              })
            })
            this.region_layer_group.addLayer(label_marker)
            this._region_label_data.push({
              id: label_id,
              bounds: bounds,
              angle: angle,
              name: name
            })
          }
        } catch (err) {
          console.error('Error rendering region:', region.id, err)
        }
      })

      this.region_layer_group.addTo(this.map)
      this._update_region_label_sizes()
    },

    _extract_polygon_coords(geojson) {
      const coords = []
      const extract = (obj) => {
        if (!obj) return
        if (obj.type === 'FeatureCollection') {
          (obj.features || []).forEach(f => extract(f))
        } else if (obj.type === 'Feature') {
          extract(obj.geometry)
        } else if (obj.type === 'Polygon') {
          (obj.coordinates[0] || []).forEach(c => coords.push(c))
        } else if (obj.type === 'MultiPolygon') {
          obj.coordinates.forEach(poly => (poly[0] || []).forEach(c => coords.push(c)))
        }
      }
      extract(geojson)
      return coords
    },

    _compute_principal_angle(coords) {
      if (!coords || coords.length < 3) return 0
      let max_dist = 0
      let angle = 0
      const step = Math.max(1, Math.floor(coords.length / 40))
      for (let i = 0; i < coords.length; i += step) {
        for (let j = i + 1; j < coords.length; j += step) {
          const dx = coords[j][0] - coords[i][0]
          const dy = coords[j][1] - coords[i][1]
          const dist = dx * dx + dy * dy
          if (dist > max_dist) {
            max_dist = dist
            angle = Math.atan2(dy, dx) * (180 / Math.PI)
          }
        }
      }
      if (angle > 90) angle -= 180
      if (angle < -90) angle += 180
      return angle
    },

    _update_region_label_sizes() {
      if (!this.map || !this._region_label_data) return

      this._region_label_data.forEach(item => {
        const el = document.getElementById(item.id)
        if (!el) return

        const sw_px = this.map.latLngToContainerPoint(item.bounds.getSouthWest())
        const ne_px = this.map.latLngToContainerPoint(item.bounds.getNorthEast())
        const region_width_px = Math.abs(ne_px.x - sw_px.x)
        const region_height_px = Math.abs(ne_px.y - sw_px.y)

        const angle_rad = Math.abs(item.angle) * Math.PI / 180
        const diagonal_px = Math.sqrt(region_width_px * region_width_px + region_height_px * region_height_px)
        const axis_px = Math.max(region_width_px, region_height_px, diagonal_px * 0.7)

        const target_px = axis_px * 0.28
        const char_count = item.name.length
        const font_size = Math.max(8, Math.min(60, target_px / (char_count * 0.65)))

        el.style.fontSize = font_size + 'px'
        el.style.transform = `translate(-50%, -50%) rotate(${-item.angle}deg)`
      })
    },

    clear_regions() {
      if (this.region_layer_group && this.map) {
        this.map.removeLayer(this.region_layer_group)
        this.region_layer_group = null
      }
      this._region_label_data = []
    }
  }
}
</script>

<style>
@import '@/styles/tag-badge.css';
@import '@/styles/timeline.css';
@import '@/styles/modal-overlay.css';

.region-label {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  white-space: nowrap;
  pointer-events: none;
}
.region-label span {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  letter-spacing: 0.05em;
  opacity: 0.7;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  display: block;
  pointer-events: none;
}
</style>
<style scoped>
.event-tags {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.event-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.clickable-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  filter: brightness(1.1);
}

.clickable-tag:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.more-tags {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  background-color: #a0aec0;
  font-style: italic;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.clickable-more-tags {
  cursor: pointer;
  transition: all 0.2s;
}

.clickable-more-tags:hover {
  background-color: #718096 !important;
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
}

.clickable-more-tags:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.show-less-tags {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  background-color: #a0aec0;
  font-style: italic;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.leaflet-map {
  height: 100%;
  width: 100%;
  border-radius: 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000001;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.modal-content.event-form-modal {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0;
}

.modal-content.event-form-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.modal-content.event-form-modal .modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
}

.modal-content.event-form-modal .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-content.event-form-modal .close-btn:hover {
  color: #374151;
}

.modal-content.event-form-modal .event-form-container {
  padding: 20px 24px;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #34495e;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.coordinates-group {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin: 15px 0;
}

.coordinates-inputs {
  display: flex;
  gap: 15px;
}

.coordinate-input {
  flex: 1;
}

.coordinate-input .coordinate-label {
  display: block;
  font-size: 12px;
  font-weight: normal;
  color: #6c757d;
  margin-bottom: 4px;
}

.coordinate-input input {
  width: 100%;
  padding: 8px 10px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: monospace;
  transition: border-color 0.3s;
}

.coordinate-input input:focus {
  outline: none;
  border-color: #3498db;
}

/* Locale tabs styling */
.locale-tabs {
  display: flex;
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
}

.locale-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.locale-tab:hover {
  background: #e9e9e9;
}

.locale-tab.active {
  background: white;
  border-bottom-color: #007cba;
  color: #007cba;
}

.locale-content {
  margin-bottom: 10px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.left-actions {
  display: flex;
  gap: 10px;
}

.right-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-create,
.btn-delete {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
}

.btn-create {
  background: #28a745;
  color: white;
}

.btn-create:hover {
  background: #218838;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
}

/* Emoji marker styling */
:deep(.emoji-marker-container) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.emoji-marker) {
  position: relative;
  font-size: 24px;
  text-align: center;
  line-height: 30px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  cursor: pointer;
  transition: transform 0.2s ease;
}

:deep(.emoji-marker:hover) {
  transform: scale(1.1);
}

/* Count badge for clustered markers */
:deep(.marker-count-badge) {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

/* Event Info Modal Styles - Timeline structure */

.event_info_modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.event_info_modal_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  gap: 0.5rem;
}

.event_info_modal_title {
  margin: 0;
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #475569;
  letter-spacing: -0.01em;
  flex: 1;
  white-space: nowrap;
}

.event_info_modal_title .event_name {
  font-weight: 600;
  color: #475569;
}

.event_info_modal_title .event_name_link {
  font-weight: 700;
  color: #4f46e5;
  cursor: pointer;
  transition: all 0.2s;
}

.event_info_modal_title .event_name_link:hover {
  color: #4338ca;
}

.event_header_actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.toggle_details_btn {
  background: none;
  border: 1px solid #e2e8f0;
  font-size: 1rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 0;
  transition: all 0.2s ease;
}

.toggle_details_btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.event_add_btn {
  background: #10b981;
  border: none;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 0;
  transition: all 0.2s ease;
  line-height: 1;
}

.event_add_btn:hover {
  background: #059669;
  transform: scale(1.05);
}

.event_close_btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #64748b;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 1;
  padding: 0;
}

.event_close_btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.event_info_modal_content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
}



.event_inline_edit_btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
  transition: color 0.2s;
  vertical-align: middle;
}

.event_inline_edit_btn:hover {
  color: #4f46e5;
}

/* Scrollbar Styling */
.event_info_modal_content::-webkit-scrollbar {
  width: 6px;
}

.event_info_modal_content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.event_info_modal_content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

/* Pin Mode Indicator */
.pin-mode-indicator {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245, 158, 11, 0.95);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  pointer-events: none;
  text-align: center;
  animation: pin-indicator-pulse 1.5s ease-in-out infinite;
}

.pin-mode-hint {
  display: block;
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.9;
  margin-top: 0.25rem;
}

@keyframes pin-indicator-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Fade Transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Cluster marker styling - enhanced visibility (for high zoom pin icons) */
::deep(.cluster-marker) {
  font-size: 28px !important; /* Slightly larger than regular markers */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); /* More prominent shadow */
}

::deep(.cluster-marker .marker-count-badge) {
  font-size: 13px; /* Slightly larger badge text */
  min-width: 22px;
  height: 22px;
  line-height: 22px;
}

/* Cluster circle styling - for regional overview (lower zoom levels) */
::deep(.cluster-circle-container) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

::deep(.cluster-circle) {
  background: linear-gradient(135deg, #4f46e5 0%, #4f46e5 100%);
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  color: white;
  font-weight: 700;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 2px 8px rgba(99, 102, 241, 0.4),
    0 4px 16px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

::deep(.cluster-circle:hover) {
  transform: scale(1.1);
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.5),
    0 6px 20px rgba(0, 0, 0, 0.25);
}

/* Ensure MarkerCluster properly styles cluster icons */
::deep(.marker-cluster-small),
::deep(.marker-cluster-medium),
::deep(.marker-cluster-large) {
  background-color: transparent !important;
  border: none !important;
}

/* Hide default MarkerCluster div backgrounds */
::deep(.marker-cluster div) {
  background-color: transparent !important;
}

/* Ensure clustered child markers are hidden */
::deep(.leaflet-marker-pane .leaflet-marker-icon.leaflet-cluster-anim) {
  opacity: 0 !important;
  pointer-events: none !important;
}

/* But keep non-clustered markers visible */
::deep(.leaflet-marker-pane .emoji-marker-container:not(.leaflet-cluster-anim)) {
  opacity: 1;
}

</style>