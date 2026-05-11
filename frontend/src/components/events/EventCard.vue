<template>
  <div class="event-card-compact">
    <!-- Title line with icon and name -->
    <div class="event_title_line">
      <span class="event_icon">{{ getEventEmoji(event.lens_type) }}</span>
      <span 
        class="event_name_link" 
        @click="$emit('show-detail', event)"
        :title="t('clickToReadMore')"
      >
        {{ event.name }}
      </span>
      <button 
        v-if="mapFilterEnabled"
        class="highlight_btn" 
        @click="$emit('highlight-event', event)" 
        :title="t('highlightOnMap')"
      >
        📍
      </button>
      <button 
        v-else
        class="focus_btn" 
        @click="$emit('focus-event', event)" 
        :title="t('focusOnMap')"
      >
        ⌖
      </button>
    </div>
    
    <!-- Description (truncated) -->
    <div 
      v-if="event.description" 
      class="event_description"
    >
      {{ event.description }}
    </div>
    
    <!-- Tags row (always visible) -->
    <div v-if="event.tags && event.tags.length > 0" class="event_tags_row">
      <span
        v-for="tag in event.tags"
        :key="tag.id"
        class="event_tag_badge"
        :style="getTagStyle(tag)"
        @click.stop="$emit('tag-clicked', tag)"
        :title="tag.description"
      >{{ tag.name }}</span>
    </div>
    
    <!-- Date below -->
    <div class="event_date_line">
      {{ formatEventDisplayDateLong(event.event_date, event.era) }}
    </div>
  </div>
</template>

<script>
import { getEventEmoji } from '@/utils/event-utils.js'
import { getContrastColor, getTagStyle } from '@/utils/color-utils.js'
import { useLocale } from '@/composables/useLocale.js'

export default {
  name: 'EventCard',
  props: {
    event: {
      type: Object,
      required: true
    },
    mapFilterEnabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['focus-event', 'highlight-event', 'tag-clicked', 'show-detail'],
  setup() {
    const { formatEventDisplayDate, formatEventDisplayDateLong, t } = useLocale()
    
    return {
      formatEventDisplayDate,
      formatEventDisplayDateLong,
      t
    }
  },
  methods: {
    getEventEmoji,
    getContrastColor,
    getTagStyle
  }
}
</script>

<style>
@import '@/styles/tag-badge.css';
</style>
<style scoped>
.event-card-compact {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.event-card-compact:hover {
  background-color: #f8f9fa;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.event_title_line {
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 1rem;
  line-height: 1.4;
}

.event_icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.event_name {
  font-weight: 500;
  color: #475569;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event_name_link {
  font-weight: 500;
  color: #4f46e5;
  cursor: pointer;
  transition: color 0.2s;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event_name_link:hover {
  color: #3730a3;
}

.event_description {
  font-size: 0.8rem;
  line-height: 1.5;
  color: #64748b;
  margin-top: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event_tags_row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.25rem;
}


.highlight_btn,
.focus_btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
  flex-shrink: 0;
  margin-left: auto;
}

.highlight_btn:hover {
  color: #f59e0b;
}

.focus_btn:hover {
  color: #4f46e5;
}

.highlight_btn:focus-visible,
.focus_btn:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
  border-radius: 2px;
}

.event_date_line {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
  font-weight: 500;
}
</style>
