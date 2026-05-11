<template>
  <Teleport to="body">
  <div v-if="isOpen" class="modal_overlay_base event_detail_modal_overlay" @click.self="closeModal">
    <div class="event_detail_modal modal_fullscreen_mobile">
      <div class="event_detail_header">
        <div class="event_title_row">
          <button 
            v-if="navigationSource" 
            class="back_btn" 
            @click="handleBack"
            :title="t('back')"
          >←</button>
          <span class="event_icon">{{ getEventEmoji(event.lens_type) }}</span>
          <span class="event_name">{{ event.name }}</span>
        </div>
        <button class="close_btn" @click="closeModal" :title="t('close')">×</button>
      </div>

      <div class="event_detail_content">
        <div class="event_date">{{ formatEventDisplayDate(event.event_date, event.era) }}</div>
        <div v-if="event.description" class="event_description">{{ event.description }}</div>
        <div v-if="event.tags && event.tags.length > 0" class="event_tags">
          <span
            v-for="tag in event.tags"
            :key="tag.id"
            class="event_tag_badge"
            :style="getTagStyle(tag)"
            @click.stop="handleTagClick(tag)"
            :title="tag.description"
          >{{ tag.name }}</span>
        </div>

        <div v-if="hasRelatedEvents" class="related_events_section">
          <div v-if="samePlace.length > 0" class="related_category">
            <div class="related_category_header">
              <span class="related_icon">📍</span>
              <span class="related_title">{{ t('samePlace') }}</span>
              <button class="refresh_related_btn" @click="refreshRelated" :title="t('refreshRelated')">↻</button>
              <button
                v-if="samePlace.length > collapsedLimit"
                class="refresh_related_btn expand_related_btn"
                @click="toggleSection('samePlace')"
                :title="expandedSections.samePlace ? t('collapseRelated') : t('expandRelated')"
              >{{ expandedSections.samePlace ? '−' : '⋯' }}</button>
            </div>
            <div class="related_list">
              <div
                v-for="relEvent in visibleSamePlace"
                :key="relEvent.id"
                class="related_item"
                :class="{ related_item_current: relEvent.id === event.id }"
              >
                <span class="related_date">{{ relEvent.id === event.id ? '*' : formatEventDisplayDate(relEvent.event_date, relEvent.era) }}</span>
                <span class="related_separator">—</span>
                <span
                  v-if="relEvent.id === event.id"
                  class="related_name_current"
                >{{ relEvent.name }}</span>
                <span
                  v-else
                  class="related_name"
                  @click="handleRelatedClick(relEvent)"
                >{{ relEvent.name }}</span>
              </div>
            </div>
          </div>

          <div v-if="aroundSameTime.length > 0" class="related_category">
            <div class="related_category_header">
              <span class="related_icon">🗓️</span>
              <span class="related_title">{{ t('aroundSameTime') }}</span>
              <button class="refresh_related_btn" @click="refreshRelated" :title="t('refreshRelated')">↻</button>
              <button
                v-if="aroundSameTime.length > collapsedLimit"
                class="refresh_related_btn expand_related_btn"
                @click="toggleSection('aroundSameTime')"
                :title="expandedSections.aroundSameTime ? t('collapseRelated') : t('expandRelated')"
              >{{ expandedSections.aroundSameTime ? '−' : '⋯' }}</button>
            </div>
            <div class="related_list">
              <div
                v-for="relEvent in visibleAroundSameTime"
                :key="relEvent.id"
                class="related_item"
                :class="{ related_item_current: relEvent.id === event.id }"
              >
                <span class="related_date">{{ relEvent.id === event.id ? '*' : formatEventDisplayDate(relEvent.event_date, relEvent.era) }}</span>
                <span class="related_separator">—</span>
                <span
                  v-if="relEvent.id === event.id"
                  class="related_name_current"
                >{{ relEvent.name }}</span>
                <span
                  v-else
                  class="related_name"
                  @click="handleRelatedClick(relEvent)"
                >{{ relEvent.name }}</span>
              </div>
            </div>
          </div>

          <div v-if="nearByKind.length > 0" class="related_category">
            <div class="related_category_header">
              <span class="related_icon">🏷️</span>
              <span class="related_title">{{ t('nearByKind') }}</span>
              <button class="refresh_related_btn" @click="refreshRelated" :title="t('refreshRelated')">↻</button>
              <button
                v-if="nearByKind.length > collapsedLimit"
                class="refresh_related_btn expand_related_btn"
                @click="toggleSection('nearByKind')"
                :title="expandedSections.nearByKind ? t('collapseRelated') : t('expandRelated')"
              >{{ expandedSections.nearByKind ? '−' : '⋯' }}</button>
            </div>
            <div class="related_list">
              <div
                v-for="relEvent in visibleNearByKind"
                :key="relEvent.id"
                class="related_item"
                :class="{ related_item_current: relEvent.id === event.id }"
              >
                <span class="related_date">{{ relEvent.id === event.id ? '*' : formatEventDisplayDate(relEvent.event_date, relEvent.era) }}</span>
                <span class="related_separator">—</span>
                <span
                  v-if="relEvent.id === event.id"
                  class="related_name_current"
                >{{ relEvent.name }}</span>
                <span
                  v-else
                  class="related_name"
                  @click="handleRelatedClick(relEvent)"
                >{{ relEvent.name }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="event_detail_footer">
        <a 
          v-if="event.source"
          :href="event.source" 
          target="_blank" 
          rel="noopener noreferrer"
          class="source_btn"
        >
          🔗 {{ t('source') }}
        </a>
        <button 
          v-if="canEditEvents" 
          class="edit_btn" 
          @click="handleEditEvent"
          :title="t('editEvent')"
        >
          ✏️ {{ t('editEvent') }}
        </button>
        <a 
          v-if="event && event.latitude && event.longitude && !canEditEvents"
          :href="`https://www.google.com/maps?q=${event.latitude},${event.longitude}`"
          target="_blank"
          rel="noopener noreferrer"
          class="google_maps_btn"
          :title="t('openGoogleMaps')"
        >
          🌍 {{ t('openGoogleMaps') }}
        </a>
        <button class="focus_btn" @click="handleFocusEvent" :title="t('focusOnMap')">
          ⌖ {{ t('focusOnMap') }}
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
import { watch, ref, computed, toRef, onMounted, onUnmounted } from 'vue'
import { useLocale } from '@/composables/useLocale.js'
import { useRelatedEvents, getChronologicalValue } from '@/composables/useRelatedEvents.js'
import { useAuth } from '@/composables/useAuth.js'
import { getEventEmoji } from '@/utils/event-utils.js'
import { getContrastColor, getTagStyle } from '@/utils/color-utils.js'

export default {
  name: 'EventDetailModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    event: {
      type: Object,
      default: () => ({})
    },
    allEvents: {
      type: Array,
      default: () => []
    },
    navigationSource: {
      type: String,
      default: null
    }
  },
  emits: ['close', 'focus-event', 'tag-clicked', 'select-event', 'edit-event', 'back'],
  setup(props, { emit }) {
    const { t, formatEventDisplayDate } = useLocale()
    const { canEditEvents } = useAuth()
    const previouslyFocusedElement = ref(null)

    const eventRef = toRef(props, 'event')
    const allEventsRef = toRef(props, 'allEvents')

    const { aroundSameTime, samePlace, nearByKind, refresh: refreshRelatedRaw } = useRelatedEvents(eventRef, allEventsRef)

    const COLLAPSED_LIMIT = 3
    const collapsedLimit = COLLAPSED_LIMIT

    const expandedSections = ref({
      samePlace: false,
      aroundSameTime: false,
      nearByKind: false
    })

    const toggleSection = (key) => {
      expandedSections.value[key] = !expandedSections.value[key]
    }

    const limitFor = (key) => expandedSections.value[key] ? Infinity : COLLAPSED_LIMIT

    const buildVisible = (list, key) => {
      const limited = list.slice(0, limitFor(key))
      if (!expandedSections.value[key] || !props.event?.id) return limited
      const merged = [...limited, props.event]
      return merged.sort((a, b) => {
        return getChronologicalValue(a.event_date, a.era) - getChronologicalValue(b.event_date, b.era)
      })
    }

    const visibleSamePlace = computed(() => buildVisible(samePlace.value, 'samePlace'))
    const visibleAroundSameTime = computed(() => buildVisible(aroundSameTime.value, 'aroundSameTime'))
    const visibleNearByKind = computed(() => buildVisible(nearByKind.value, 'nearByKind'))

    const refreshRelated = () => {
      expandedSections.value = { samePlace: false, aroundSameTime: false, nearByKind: false }
      refreshRelatedRaw()
    }

    watch(() => props.event?.id, () => {
      expandedSections.value = { samePlace: false, aroundSameTime: false, nearByKind: false }
    })

    const hasRelatedEvents = computed(() => {
      return aroundSameTime.value.length > 0 ||
             samePlace.value.length > 0 ||
             nearByKind.value.length > 0
    })

    const closeModal = () => {
      emit('close')
    }

    const handleFocusEvent = () => {
      emit('focus-event', props.event)
      closeModal()
    }

    const handleTagClick = (tag) => {
      emit('tag-clicked', tag)
      closeModal()
    }

    const handleRelatedClick = (relEvent) => {
      emit('select-event', relEvent)
    }

    const handleEditEvent = () => {
      emit('edit-event', props.event)
      closeModal()
    }

    const handleBack = () => {
      emit('back')
      closeModal()
    }

    const handleKeydown = (e) => {
      if (e.key === 'Escape' && props.isOpen) {
        closeModal()
      }
    }

    watch(() => props.isOpen, (newVal) => {
      if (newVal) {
        previouslyFocusedElement.value = document.activeElement
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
        if (previouslyFocusedElement.value) {
          previouslyFocusedElement.value.focus()
        }
      }
    })

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    })

    return {
      t,
      formatEventDisplayDate,
      getEventEmoji,
      getContrastColor,
      getTagStyle,
      canEditEvents,
      closeModal,
      handleFocusEvent,
      handleTagClick,
      handleRelatedClick,
      handleEditEvent,
      handleBack,
      aroundSameTime,
      samePlace,
      nearByKind,
      visibleSamePlace,
      visibleAroundSameTime,
      visibleNearByKind,
      expandedSections,
      collapsedLimit,
      toggleSection,
      hasRelatedEvents,
      refreshRelated
    }
  }
}
</script>

<style>
@import '@/styles/tag-badge.css';
@import '@/styles/modal-overlay.css';
</style>
<style scoped>
.event_detail_modal_overlay {
  background: rgba(0, 0, 0, 0.5);
}

.event_detail_modal {
  max-width: 500px;
  max-height: 80vh;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

@media (min-width: 900px) {
  .event_detail_modal {
    max-width: 660px;
  }
}

.event_detail_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  gap: 1rem;
}

.event_title_row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.event_icon {
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
}

.event_name {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #475569;
  word-break: break-word;
  line-height: 1.3;
}

.back_btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  line-height: 1;
  flex-shrink: 0;
  border-radius: 4px;
  transition: all 0.2s;
}

.back_btn:hover {
  color: #4f46e5;
  background: #f1f5f9;
}

.close_btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.close_btn:hover {
  color: #334155;
}

.event_detail_content {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.event_date {
  font-size: 0.8rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.event_description {
  font-size: 1rem;
  line-height: 1.6;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
}

.event_tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.75rem;
}


.related_events_section {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.refresh_related_btn {
  background: none;
  border: none;
  font-size: 0.85rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  margin-left: 0.375rem;
  line-height: 1;
  transition: color 0.2s;
}

.refresh_related_btn:hover {
  color: #4f46e5;
}

.expand_related_btn {
  font-size: 1rem;
  margin-left: 0.125rem;
  letter-spacing: 0.05em;
}

.related_category {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.related_category_header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.related_icon {
  font-size: 0.875rem;
}

.related_title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.related_list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 1.25rem;
}

.related_item {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  font-size: 0.8rem;
  line-height: 1.4;
}

.related_date {
  color: #64748b;
  flex-shrink: 0;
}

.related_separator {
  color: #94a3b8;
}

@media (max-width: 640px) {
  .related_date,
  .related_separator {
    display: none;
  }
}

.related_name {
  color: #4f46e5;
  cursor: pointer;
  font-weight: 500;
  word-break: break-word;
}

.related_name:hover {
  text-decoration: underline;
}

.related_item_current .related_date {
  color: #4f46e5;
  font-weight: 700;
}

.related_name_current {
  color: #475569;
  font-weight: 600;
  word-break: break-word;
}

.event_detail_footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}

.focus_btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #4f46e5;
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.focus_btn:hover {
  background: #4338ca;
}

.source_btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #475569;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.source_btn:hover {
  background: #e2e8f0;
  color: #4f46e5;
}

.edit_btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f59e0b;
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.edit_btn:hover {
  background: #d97706;
}

.google_maps_btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.google_maps_btn:hover {
  background: #e2e8f0;
  color: #10b981;
}

</style>
