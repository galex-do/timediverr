<template>
  <div class="tag_filter_panel">
    <!-- Tag Search Input -->
    <div class="tag_search_container" ref="searchContainerRef">
      <input
        v-model="searchQuery"
        type="text"
        class="tag_search_input"
        :placeholder="t('searchTags')"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>
    
    <!-- Tag Suggestions Dropdown (Teleported to body) -->
    <Teleport to="body">
      <div 
        v-if="showSuggestions && filteredAvailableTags.length > 0" 
        ref="dropdownRef"
        class="tag_suggestions" 
        :style="dropdownPosition"
      >
        <div
          v-for="tag in filteredAvailableTags"
          :key="tag.id"
          class="tag_suggestion_item"
          @mousedown.prevent="addTag(tag)"
          :style="{ 
            borderLeftColor: tag.color || '#4f46e5'
          }"
        >
          <span class="tag_suggestion_name">{{ tag.name }}</span>
          <span class="tag_suggestion_count">({{ getTagEventCount(tag.id) }})</span>
        </div>
      </div>
      
      <div 
        v-if="showSuggestions && searchQuery && filteredAvailableTags.length === 0" 
        ref="dropdownRef"
        class="no_suggestions" 
        :style="dropdownPosition"
      >
        {{ t('noTagsFound') }}
      </div>
    </Teleport>

    <!-- Selected Tags Section -->
    <div v-if="selectedTags.length > 0" class="selected_tags_section">
      <div class="tag_filter_header">
        <span class="filter_label">{{ t('filteredByTags') }}:</span>
        <div class="header_actions">
          <button 
            class="tag_action_btn"
            :class="{ 'active': followEnabled }"
            @click="$emit('toggle-follow')"
            :title="followEnabled ? t('disableNarrativeFlow') : t('enableNarrativeFlow')"
          >
            {{ followEnabled ? '🔗' : '○' }}
          </button>
          <button
            class="tag_action_btn"
            @click="$emit('focus-on-filtered')"
            :title="t('focusOnFilteredTitle')"
          >
            ⌖
          </button>
          <button 
            class="tag_action_btn danger" 
            @click="$emit('clear-all-tags')"
            :title="t('clearAllTags')"
          >
            ✕
          </button>
        </div>
      </div>
      <div class="tag_chips_container">
        <div 
          v-for="tag in selectedTags" 
          :key="tag.id"
          class="event_tag_badge_removable"
          :style="getTagStyle(tag, { outerShadow: '0 1px 3px rgba(0, 0, 0, 0.15)' })"
        >
          <span class="tag_name">{{ tag.name }}</span>
          <button 
            class="toggle_negative_btn"
            @click="$emit('toggle-tag-negative', tag.id)"
            :title="tag.negative ? t('tagFilterModeExclude') : t('tagFilterModeInclude')"
          >
            {{ tag.negative ? '−' : '+' }}
          </button>
          <button 
            class="remove_tag_btn" 
            @click="$emit('remove-tag', tag.id)"
            :aria-label="`${t('remove')} ${tag.name}`"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLocale } from '@/composables/useLocale.js'
import { getContrastColor, getTagStyle } from '@/utils/color-utils.js'

export default {
  name: 'TagFilterPanel',
  props: {
    selectedTags: {
      type: Array,
      default: () => []
    },
    availableTags: {
      type: Array,
      default: () => []
    },
    followEnabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['remove-tag', 'clear-all-tags', 'toggle-follow', 'add-tag', 'focus-on-filtered', 'toggle-tag-negative'],
  setup(props, { emit }) {
    const { t } = useLocale()
    
    const searchQuery = ref('')
    const showSuggestions = ref(false)
    const searchContainerRef = ref(null)
    const dropdownRef = ref(null)
    const dropdownPosition = ref({})
    
    // Filter available tags based on search query and exclude already selected tags
    const filteredAvailableTags = computed(() => {
      const query = searchQuery.value.toLowerCase().trim()
      const selectedTagIds = new Set(props.selectedTags.map(tag => tag.id))
      
      return props.availableTags
        .filter(tag => {
          // Exclude already selected tags
          if (selectedTagIds.has(tag.id)) {
            return false
          }
          
          // If no search query, show all available tags
          if (!query) {
            return true
          }
          
          // Filter by search query
          return tag.name.toLowerCase().includes(query)
        })
        .slice(0, 10) // Limit to 10 suggestions for performance
    })
    
    const calculateDropdownPosition = () => {
      if (searchContainerRef.value) {
        const rect = searchContainerRef.value.getBoundingClientRect()
        dropdownPosition.value = {
          position: 'fixed',
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`
        }
      }
    }
    
    const handleFocus = () => {
      showSuggestions.value = true
      calculateDropdownPosition()
    }
    
    const addTag = (tag) => {
      emit('add-tag', tag)
      searchQuery.value = ''
      showSuggestions.value = true
      calculateDropdownPosition()
    }
    
    const handleBlur = () => {
      // Delay hiding to allow click events to fire
      setTimeout(() => {
        showSuggestions.value = false
      }, 200)
    }
    
    // Close dropdown on scroll (but not if scrolling inside the dropdown itself)
    const handleScroll = (event) => {
      if (showSuggestions.value && dropdownRef.value) {
        // Check if the scroll event originated from inside the dropdown
        const isScrollInsideDropdown = dropdownRef.value.contains(event.target)
        
        // Only close if scrolling outside the dropdown
        if (!isScrollInsideDropdown) {
          showSuggestions.value = false
        }
      }
    }
    
    // Get the event count for a tag (now passed via availableTags prop)
    const getTagEventCount = (tagId) => {
      const tag = props.availableTags.find(t => t.id === tagId)
      return tag?.count || 0
    }
    
    // Setup scroll listener on mount
    onMounted(() => {
      window.addEventListener('scroll', handleScroll, true) // useCapture for all scrollable elements
    })
    
    // Cleanup scroll listener on unmount
    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll, true)
    })
    
    return {
      t,
      searchQuery,
      showSuggestions,
      searchContainerRef,
      dropdownRef,
      dropdownPosition,
      filteredAvailableTags,
      addTag,
      handleFocus,
      handleBlur,
      getTagEventCount,
      getContrastColor,
      getTagStyle
    }
  }
}
</script>

<style>
@import '@/styles/tag-badge.css';
</style>
<style scoped>
.tag_filter_panel {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin: 0 0 0.5rem 0;
}

.tag_search_container {
  position: relative;
  margin-bottom: 0.75rem;
}

.tag_search_input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
  background: white;
}

.tag_search_input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.tag_search_input::placeholder {
  color: #94a3b8;
}

.tag_suggestions {
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 10000;
}

.tag_suggestion_item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 3px solid;
  transition: all 0.2s;
}

.tag_suggestion_item:hover {
  background: #f1f5f9;
}

.tag_suggestion_name {
  font-size: 0.875rem;
  color: #334155;
  font-weight: 500;
}

.tag_suggestion_count {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: 0.5rem;
}

.no_suggestions {
  padding: 0.75rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  z-index: 10000;
}

.selected_tags_section {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
}

.tag_filter_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.filter_label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.header_actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tag_action_btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.tag_action_btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
  color: #1e293b;
}

.tag_action_btn.active {
  background: #4f46e5;
  border-color: #4338ca;
  color: white;
}

.tag_action_btn.active:hover {
  background: #4338ca;
  border-color: #3730a3;
}

.tag_action_btn.danger {
  color: #dc2626;
}

.tag_action_btn.danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.tag_chips_container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
