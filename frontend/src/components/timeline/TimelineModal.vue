<template>
  <Teleport to="body">
  <div v-if="isOpen" class="modal_overlay_base timeline_modal_overlay" @click.self="closeModal">
    <div class="timeline_modal modal_fullscreen_mobile">
      <!-- Modal Header -->
      <div class="timeline_modal_header">
        <div class="timeline_header_top">
          <h2 class="timeline_modal_title" ref="titleElement">{{ displayTitle }}</h2>
          <div class="timeline_header_controls">
            <span v-if="totalEventCount > 0" class="timeline_event_count">
              {{ visibleEventCount }} / {{ totalEventCount }}
            </span>
            <button 
              class="toggle_details_btn" 
              @click="toggleDetails"
              :title="showDetails ? t('hideDetails') : t('showDetails')"
            >
              {{ showDetails ? '📝' : '📋' }}
            </button>
            <button class="close_btn" @click="closeModal" :title="t('close')">×</button>
          </div>
        </div>
        <div v-if="selectedTags && selectedTags.length > 0" class="timeline_header_tags">
          <div
            v-for="tag in selectedTags"
            :key="tag.id"
            class="event_tag_badge_removable"
            :style="getTagStyle(tag, { outerShadow: '0 1px 3px rgba(0, 0, 0, 0.15)' })"
          >
            <span class="tag_name">{{ tag.name }}</span>
            <button 
              class="remove_tag_btn" 
              @click="handleRemoveTag(tag.id)"
              :aria-label="`${t('remove')} ${tag.name}`"
            >
              ×
            </button>
          </div>
          <button 
            class="expand_date_range_btn" 
            @click="handleExpandDateRange"
            :title="t('expandDateRange')"
          >🔍</button>
        </div>
      </div>

      <!-- Modal Content -->
      <div 
        class="timeline_modal_content" 
        ref="scrollContainer"
        @scroll="handleScroll"
      >
        <div v-if="visibleYearGroups.length === 0 && !isLoading" class="no_events_message">
          {{ t('noEventsInTimeline') }}
        </div>

        <div v-else class="timeline_container">
          <div v-for="yearGroup in visibleYearGroups" :key="yearGroup.yearKey" class="timeline_year_group" :data-year-key="yearGroup.yearKey">
            <!-- Single event in this year: everything on one line -->
            <div v-if="yearGroup.totalEvents === 1" class="timeline_single_event_line">
              <div class="timeline_bullet"></div>
              <span class="timeline_single_text">
                <span class="timeline_date_inline">{{ yearGroup.dateGroups[0].events[0]._formattedDate }}</span>
                {{ ' ' }}
                <span class="event_icon">{{ resolve_event_emoji(yearGroup.dateGroups[0].events[0]) }}</span>
                {{ ' ' }}
                <span 
                   class="event_name event_name_link"
                   @click="handleShowDetail(yearGroup.dateGroups[0].events[0])"
                >{{ yearGroup.dateGroups[0].events[0].name }}</span>
                <template v-if="!showDetails && getKeyColorTags(yearGroup.dateGroups[0].events[0].tags).length > 0">
                  <span 
                    v-for="kt in getKeyColorTags(yearGroup.dateGroups[0].events[0].tags)" 
                    :key="'kc-' + kt.id"
                    class="key_color_dot"
                    :style="{ backgroundColor: kt.color }"
                    :title="kt.name"
                  ></span>
                </template>
                <template v-if="showDetails && yearGroup.dateGroups[0].events[0].description">
                  <div class="event_description_text">{{ yearGroup.dateGroups[0].events[0].description.trim() }}</div>
                </template>
                <template v-if="showDetails && yearGroup.dateGroups[0].events[0].tags && yearGroup.dateGroups[0].events[0].tags.length > 0">
                  {{ ' ' }}
                  <span class="tags_expand_wrapper" :class="{ 'expanded': is_tags_expanded(yearGroup.dateGroups[0].events[0].id) }" @mouseenter="on_tags_hover(yearGroup.dateGroups[0].events[0].id)" @mouseleave="on_tags_leave(yearGroup.dateGroups[0].events[0].id)">
                    <span 
                      class="tags_expand_toggle"
                      @click.stop="toggle_event_tags(yearGroup.dateGroups[0].events[0].id)"
                    >...</span>
                    <span class="tags_hover_list">
                      <span
                        v-for="tag in yearGroup.dateGroups[0].events[0].tags"
                        :key="tag.id"
                        class="event_tag_badge"
                        :style="getTagStyle(tag)"
                        @click.stop="handleTagClick(tag)"
                      >{{ tag.name }}</span>
                    </span>
                  </span>
                </template>
                <template v-if="showDetails">
                  {{ ' ' }}
                  <button 
                    class="timeline_focus_btn" 
                    @click="handleFocusEvent(yearGroup.dateGroups[0].events[0])"
                    :title="t('focusOnMap')"
                  >
                    ⌖
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
                        <span class="event_icon">{{ resolve_event_emoji(dateGroup.events[0]) }}</span>
                        {{ ' ' }}
                        <span 
                           class="event_name event_name_link"
                           @click="handleShowDetail(dateGroup.events[0])"
                        >{{ dateGroup.events[0].name }}</span>
                        <template v-if="!showDetails && getKeyColorTags(dateGroup.events[0].tags).length > 0">
                          <span 
                            v-for="kt in getKeyColorTags(dateGroup.events[0].tags)" 
                            :key="'kc-' + kt.id"
                            class="key_color_dot"
                            :style="{ backgroundColor: kt.color }"
                            :title="kt.name"
                          ></span>
                        </template>
                        <template v-if="showDetails && dateGroup.events[0].description">
                          <div class="event_description_text">{{ dateGroup.events[0].description.trim() }}</div>
                        </template>
                        <template v-if="showDetails && dateGroup.events[0].tags && dateGroup.events[0].tags.length > 0">
                          {{ ' ' }}
                          <span class="tags_expand_wrapper" :class="{ 'expanded': is_tags_expanded(dateGroup.events[0].id) }" @mouseenter="on_tags_hover(dateGroup.events[0].id)" @mouseleave="on_tags_leave(dateGroup.events[0].id)">
                            <span 
                              class="tags_expand_toggle"
                              @click.stop="toggle_event_tags(dateGroup.events[0].id)"
                            >...</span>
                            <span class="tags_hover_list">
                              <span
                                v-for="tag in dateGroup.events[0].tags"
                                :key="tag.id"
                                class="event_tag_badge"
                                :style="getTagStyle(tag)"
                                @click.stop="handleTagClick(tag)"
                              >{{ tag.name }}</span>
                            </span>
                          </span>
                        </template>
                        <template v-if="showDetails">
                          {{ ' ' }}
                          <button 
                            class="timeline_focus_btn" 
                            @click="handleFocusEvent(dateGroup.events[0])"
                            :title="t('focusOnMap')"
                          >
                            ⌖
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
                        <span class="event_icon">{{ resolve_event_emoji(event) }}</span>
                        {{ ' ' }}
                        <span 
                           class="event_name event_name_link"
                           @click="handleShowDetail(event)"
                        >{{ event.name }}</span>
                        <template v-if="!showDetails && getKeyColorTags(event.tags).length > 0">
                          <span 
                            v-for="kt in getKeyColorTags(event.tags)" 
                            :key="'kc-' + kt.id"
                            class="key_color_dot"
                            :style="{ backgroundColor: kt.color }"
                            :title="kt.name"
                          ></span>
                        </template>
                        <template v-if="showDetails && event.description">
                          <div class="event_description_text">{{ event.description.trim() }}</div>
                        </template>
                        <template v-if="showDetails && event.tags && event.tags.length > 0">
                          {{ ' ' }}
                          <span class="tags_expand_wrapper" :class="{ 'expanded': is_tags_expanded(event.id) }" @mouseenter="on_tags_hover(event.id)" @mouseleave="on_tags_leave(event.id)">
                            <span 
                              class="tags_expand_toggle"
                              @click.stop="toggle_event_tags(event.id)"
                            >...</span>
                            <span class="tags_hover_list">
                              <span
                                v-for="tag in event.tags"
                                :key="tag.id"
                                class="event_tag_badge"
                                :style="getTagStyle(tag)"
                                @click.stop="handleTagClick(tag)"
                              >{{ tag.name }}</span>
                            </span>
                          </span>
                        </template>
                        <template v-if="showDetails">
                          {{ ' ' }}
                          <button 
                            class="timeline_focus_btn" 
                            @click="handleFocusEvent(event)"
                            :title="t('focusOnMap')"
                          >
                            ⌖
                          </button>
                        </template>
                      </span>
                    </div>
                  </template>
                </template>
              </div>
            </template>
          </div>
          
          <!-- Loading indicator -->
          <div v-if="isLoading" class="timeline_loading">
            {{ t('loading') || 'Loading...' }}
          </div>
          
          <!-- Load more indicator -->
          <div v-if="hasMoreEvents && !isLoading" class="timeline_load_more" ref="loadMoreTrigger">
            <span class="load_more_hint">↓ {{ t('scrollForMore') || 'Scroll for more' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useLocale } from '@/composables/useLocale.js'
import { getEventEmoji, getTagEmoji } from '@/utils/event-utils.js'
import { getContrastColor, getTagStyle, getKeyColorTags } from '@/utils/color-utils.js'

export default {
  name: 'TimelineModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    events: {
      type: Array,
      default: () => []
    },
    preserveScroll: {
      type: Boolean,
      default: false
    },
    dateFromDisplay: {
      type: String,
      default: ''
    },
    dateToDisplay: {
      type: String,
      default: ''
    },
    selectedTags: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'focus-event', 'tag-clicked', 'remove-tag', 'show-detail', 'expand-date-range'],
  setup(props, { emit }) {
    const { t, formatEventDisplayDate, formatDayMonth, currentLocale } = useLocale()
    const previouslyFocusedElement = ref(null)
    const scrollContainer = ref(null)
    
    const BATCH_SIZE = 50
    const visibleCount = ref(BATCH_SIZE)
    const showDetails = ref(false)
    const isLoading = ref(false)
    const expanded_tags = ref(new Set())
    const hover_timers = {}

    const toggle_event_tags = (event_id) => {
      const s = new Set(expanded_tags.value)
      if (s.has(event_id)) {
        s.delete(event_id)
      } else {
        s.add(event_id)
      }
      expanded_tags.value = s
    }

    const is_tags_expanded = (event_id) => {
      return expanded_tags.value.has(event_id)
    }

    const on_tags_hover = (event_id) => {
      if (expanded_tags.value.has(event_id)) return
      hover_timers[event_id] = setTimeout(() => {
        const s = new Set(expanded_tags.value)
        s.add(event_id)
        expanded_tags.value = s
      }, 500)
    }

    const on_tags_leave = (event_id) => {
      if (hover_timers[event_id]) {
        clearTimeout(hover_timers[event_id])
        delete hover_timers[event_id]
      }
    }
    
    const localizeDate = (dateStr) => {
      if (!dateStr) return ''
      return dateStr
        .replace(/\bBC\b/, t('eraBC'))
        .replace(/\bAD\b/, t('eraAD'))
    }

    const titleElement = ref(null)
    const useShortTitle = ref(false)

    const timelineTitle = computed(() => {
      const from = localizeDate(props.dateFromDisplay)
      const to = localizeDate(props.dateToDisplay)
      if (from && to) {
        return `${t('eventsFromToPrefix')} ${from} ${t('eventsFromToMiddle')} ${to}`
      }
      return t('historicalEvents')
    })

    const shortTitle = computed(() => t('eventsFromToPrefix').split(' ')[0] || t('historicalEvents'))

    const displayTitle = computed(() => useShortTitle.value ? shortTitle.value : timelineTitle.value)

    const checkTitleOverflow = () => {
      nextTick(() => {
        const el = titleElement.value
        if (!el) return
        useShortTitle.value = false
        nextTick(() => {
          if (el.scrollHeight > el.clientHeight + 2) {
            useShortTitle.value = true
          }
        })
      })
    }

    const cachedGroupedEvents = ref([])
    const lastEventsHash = ref('')

    const getEventsHash = (events) => {
      if (!events || events.length === 0) return ''
      return `${events.length}-${events[0]?.id}-${events[events.length - 1]?.id}`
    }

    const getChronologicalValue = (dateString, era) => {
      let year, month, day
      
      if (dateString.startsWith('-')) {
        const parts = dateString.substring(1).split('T')[0].split('-')
        year = parseInt(parts[0], 10)
        month = parseInt(parts[1], 10) - 1
        day = parseInt(parts[2], 10)
      } else {
        const parts = dateString.split('T')[0].split('-')
        year = parseInt(parts[0], 10)
        month = parseInt(parts[1], 10) - 1
        day = parseInt(parts[2], 10)
      }
      
      if (era === 'BC') {
        return -(year - (month / 12) - (day / 365))
      } else {
        return year + (month / 12) + (day / 365)
      }
    }

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
      const eraLabel = era === 'BC' ? t('eraBC') : t('eraAD')
      return `${year} ${eraLabel}`
    }

    const isJanFirst = (isoDateString) => {
      const datePart = isoDateString.startsWith('-')
        ? isoDateString.substring(1).split('T')[0]
        : isoDateString.split('T')[0]
      const parts = datePart.split('-')
      return parseInt(parts[1], 10) === 1 && parseInt(parts[2], 10) === 1
    }

    const computeGroupedEvents = (events) => {
      if (!events || events.length === 0) {
        return []
      }

      const sortedEvents = [...events].sort((a, b) => {
        const aValue = getChronologicalValue(a.event_date, a.era)
        const bValue = getChronologicalValue(b.event_date, b.era)
        return aValue - bValue
      })

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
              formattedDate: formatDayMonth(event.event_date),
              isYearOnly: isJanFirst(event.event_date),
              events: []
            })
          }
          dateMap.get(eventDate).events.push({
            ...event,
            _formattedDate: formatEventDisplayDate(event.event_date, event.era)
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
    }

    watch([() => props.events, currentLocale], ([newEvents]) => {
      const newHash = getEventsHash(newEvents) + '_' + currentLocale.value?.code
      if (newHash !== lastEventsHash.value) {
        lastEventsHash.value = newHash
        cachedGroupedEvents.value = computeGroupedEvents(newEvents)
      }
    }, { immediate: true })

    const allGroupedEvents = computed(() => cachedGroupedEvents.value)

    const totalEventCount = computed(() => props.events?.length || 0)

    const visibleYearGroups = computed(() => {
      const groups = allGroupedEvents.value
      let eventCount = 0
      const result = []
      
      for (const yearGroup of groups) {
        if (eventCount >= visibleCount.value) break
        
        const remainingSlots = visibleCount.value - eventCount
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
    })

    const visibleEventCount = computed(() => {
      return visibleYearGroups.value.reduce((sum, yg) => sum + yg.totalEvents, 0)
    })

    const hasMoreEvents = computed(() => {
      return visibleEventCount.value < totalEventCount.value
    })

    const loadMore = () => {
      if (isLoading.value || !hasMoreEvents.value) return
      
      isLoading.value = true
      
      requestAnimationFrame(() => {
        visibleCount.value += BATCH_SIZE
        isLoading.value = false
      })
    }

    const handleScroll = (e) => {
      const container = e.target
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      
      if (scrollBottom < 100 && hasMoreEvents.value && !isLoading.value) {
        loadMore()
      }
    }

    const toggleDetails = () => {
      const container = scrollContainer.value
      if (!container) {
        showDetails.value = !showDetails.value
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
      showDetails.value = !showDetails.value
      nextTick(() => {
        if (anchor) {
          const el = container.querySelector(`.timeline_year_group[data-year-key="${anchor.key}"]`)
          if (el) {
            const newRect = el.getBoundingClientRect()
            const newRelativeTop = newRect.top - containerRect.top
            container.scrollTop += newRelativeTop - anchor.relativeTop
          }
        }
      })
    }

    const closeModal = () => {
      emit('close')
      if (previouslyFocusedElement.value) {
        previouslyFocusedElement.value.focus()
        previouslyFocusedElement.value = null
      }
    }

    const handleFocusEvent = (event) => {
      emit('focus-event', event)
      closeModal()
    }

    const handleRemoveTag = (tagId) => {
      emit('remove-tag', tagId)
      visibleCount.value = BATCH_SIZE
    }

    const handleTagClick = (tag) => {
      emit('tag-clicked', tag)
      visibleCount.value = BATCH_SIZE
    }

    const handleExpandDateRange = () => {
      if (!props.events || props.events.length === 0) return
      
      let minChron = Infinity
      let maxChron = -Infinity
      let minEvent = null
      let maxEvent = null
      
      for (const event of props.events) {
        const val = getChronologicalValue(event.event_date, event.era)
        if (val < minChron) {
          minChron = val
          minEvent = event
        }
        if (val > maxChron) {
          maxChron = val
          maxEvent = event
        }
      }
      
      if (!minEvent || !maxEvent) return

      const extractYear = (ev) => {
        const dateStr = ev.event_date
        let year
        if (dateStr.startsWith('-')) {
          year = parseInt(dateStr.substring(1).split('T')[0].split('-')[0], 10)
        } else {
          year = parseInt(dateStr.split('T')[0].split('-')[0], 10)
        }
        return year
      }
      
      const fromYear = extractYear(minEvent)
      const toYear = extractYear(maxEvent)
      const fromDisplay = `${fromYear} ${minEvent.era || 'AD'}`
      const toDisplay = `${toYear} ${maxEvent.era || 'AD'}`
      
      emit('expand-date-range', { fromDisplay, toDisplay })
      closeModal()
    }

    const savedScrollPosition = ref(0)
    const savedVisibleCount = ref(0)

    const handleShowDetail = (event) => {
      // Save scroll position and loaded count before closing
      if (scrollContainer.value) {
        savedScrollPosition.value = scrollContainer.value.scrollTop
      }
      savedVisibleCount.value = visibleCount.value
      emit('show-detail', event)
      closeModal()
    }


    const handleEscape = (event) => {
      if (event.key === 'Escape' && props.isOpen) {
        closeModal()
      }
    }

    let resizeObserver = null

    watch(() => props.isOpen, (newValue) => {
      if (newValue) {
        previouslyFocusedElement.value = document.activeElement
        document.addEventListener('keydown', handleEscape)
        
        if (props.preserveScroll && savedVisibleCount.value > 0) {
          visibleCount.value = savedVisibleCount.value
        } else {
          visibleCount.value = BATCH_SIZE
        }
        
        nextTick(() => {
          if (scrollContainer.value) {
            if (props.preserveScroll && savedScrollPosition.value > 0) {
              scrollContainer.value.scrollTop = savedScrollPosition.value
            } else {
              scrollContainer.value.scrollTop = 0
              savedScrollPosition.value = 0
              savedVisibleCount.value = 0
            }
          }
          checkTitleOverflow()
          if (titleElement.value) {
            resizeObserver = new ResizeObserver(() => checkTitleOverflow())
            resizeObserver.observe(titleElement.value)
          }
        })
      } else {
        document.removeEventListener('keydown', handleEscape)
        if (resizeObserver) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
      }
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleEscape)
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
    })

    return {
      t,
      scrollContainer,
      titleElement,
      timelineTitle,
      displayTitle,
      visibleYearGroups,
      totalEventCount,
      visibleEventCount,
      hasMoreEvents,
      isLoading,
      showDetails,
      toggleDetails,
      closeModal,
      handleFocusEvent,
      handleRemoveTag,
      handleTagClick,
      handleExpandDateRange,
      handleShowDetail,
      handleScroll,
      getEventEmoji,
      resolve_event_emoji: (event) => getTagEmoji(event?.tags) || getEventEmoji(event?.lens_type),
      getContrastColor,
      getTagStyle,
      getKeyColorTags,
      toggle_event_tags,
      is_tags_expanded,
      on_tags_hover,
      on_tags_leave
    }
  }
}
</script>

<style>
@import '@/styles/tag-badge.css';
@import '@/styles/timeline.css';
@import '@/styles/modal-overlay.css';
</style>
<style scoped>

.timeline_modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.timeline_modal_header {
  display: flex;
  flex-direction: column;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  gap: 0.5rem;
  flex-shrink: 0;
}

.timeline_header_top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.timeline_header_controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.timeline_modal_title {
  margin: 0;
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #475569;
  letter-spacing: -0.01em;
  min-width: 0;
  max-height: 1.8em;
  overflow: hidden;
}

.timeline_event_count {
  font-size: 0.8rem;
  font-weight: 400;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.timeline_header_tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.expand_date_range_btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  margin-left: 0.2rem;
  line-height: 1;
  transition: color 0.2s;
}

.expand_date_range_btn:hover {
  color: #4f46e5;
}

.toggle_details_btn {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1.1rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: all 0.2s;
}

.toggle_details_btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.close_btn {
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

.close_btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.timeline_modal_content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
}

.no_events_message {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.875rem;
}



.timeline_focus_btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
  transition: color 0.2s;
  vertical-align: middle;
}

.timeline_focus_btn:hover {
  color: #4f46e5;
}

.timeline_loading {
  text-align: center;
  padding: 1rem;
  color: #64748b;
  font-size: 0.875rem;
}

.timeline_load_more {
  text-align: center;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.load_more_hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.timeline_modal_content::-webkit-scrollbar {
  width: 6px;
}

.timeline_modal_content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.timeline_modal_content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

@media (max-width: 768px) {
  .timeline_modal_header {
    padding: 0.75rem 1rem;
  }

  .timeline_modal_content {
    padding: 0.75rem 1rem;
  }
}
</style>
