<template>
  <div class="event-form-container">
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <form @submit.prevent="handleSubmit">
      <!-- Locale Selection Tabs -->
      <div class="locale-tabs">
        <button type="button" 
                :class="['locale-tab', { active: activeLocaleTab === 'en' }]" 
                @click="activeLocaleTab = 'en'">
          English
        </button>
        <button type="button" 
                :class="['locale-tab', { active: activeLocaleTab === 'ru' }]" 
                @click="activeLocaleTab = 'ru'">
          Русский
        </button>
      </div>

      <!-- English Fields -->
      <div v-show="activeLocaleTab === 'en'" class="locale-content">
        <div class="form-row">
          <div class="form-group">
            <label for="event-name-en">Event Name (English) *</label>
            <input 
              id="event-name-en"
              v-model="formData.name_en" 
              type="text" 
              required 
              class="form-input"
              placeholder="Enter event name in English"
            />
          </div>
          <div class="form-group">
            <label for="event-type">Type *</label>
            <select id="event-type" v-model="formData.lens_type" required class="form-input">
              <option value="">Select type</option>
              <option 
                v-for="lensType in getAvailableLensTypes()" 
                :key="lensType.value" 
                :value="lensType.value"
              >
                {{ lensType.label }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="event-description-en">Description (English) *</label>
          <textarea 
            id="event-description-en"
            v-model="formData.description_en" 
            required 
            class="form-textarea"
            placeholder="Enter event description in English"
            rows="4"
          ></textarea>
        </div>
      </div>

      <!-- Russian Fields -->
      <div v-show="activeLocaleTab === 'ru'" class="locale-content">
        <div class="form-group">
          <label for="event-name-ru">Event Name (Russian)</label>
          <input 
            id="event-name-ru"
            v-model="formData.name_ru" 
            type="text" 
            class="form-input"
            placeholder="Введите название события на русском языке"
          />
        </div>
        
        <div class="form-group">
          <label for="event-description-ru">Description (Russian)</label>
          <textarea 
            id="event-description-ru"
            v-model="formData.description_ru" 
            class="form-textarea"
            placeholder="Введите описание события на русском языке"
            rows="4"
          ></textarea>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="event-date">Date *</label>
          <input 
            id="event-date"
            v-model="formData.date_display" 
            type="text" 
            required 
            class="form-input"
            placeholder="DD/MM/YYYY"
            @input="updateEventDate"
          />
          <small class="form-hint">Format: DD/MM/YYYY (e.g., 15/03/1066 or 01/01/146 for BC dates)</small>
        </div>
        <div class="form-group">
          <label for="event-era">Era *</label>
          <select 
            id="event-era"
            v-model="formData.era" 
            required
            class="form-input"
          >
            <option value="BC">BC (Before Christ)</option>
            <option value="AD">AD (Anno Domini)</option>
          </select>
          <small class="form-hint">Select BC for dates before year 1, AD for dates after</small>
        </div>
      </div>
      
      <div class="form-row coordinates-row">
        <div class="form-group">
          <label for="event-latitude">Latitude *</label>
          <input 
            id="event-latitude"
            v-model.number="formData.latitude" 
            type="number" 
            step="any"
            min="-90"
            max="90"
            required
            class="form-input"
            placeholder="e.g., 51.5074"
          />
        </div>
        <div class="form-group">
          <label for="event-longitude">Longitude *</label>
          <input 
            id="event-longitude"
            v-model.number="formData.longitude" 
            type="number" 
            step="any"
            min="-180"
            max="180"
            required
            class="form-input"
            placeholder="e.g., -0.1278"
          />
        </div>
        <div class="form-group pin-button-group">
          <label>&nbsp;</label>
          <button 
            type="button"
            class="pin-button"
            :class="{ active: pinMode }"
            @click="$emit('toggle-pin')"
            :title="pinMode ? t('clickMapToSetLocation') : t('pickLocationFromMap')"
          >
            📍
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="event-source">Source (optional)</label>
        <input 
          id="event-source"
          v-model="formData.source" 
          type="url"
          class="form-input"
          placeholder="https://example.com/source"
        />
        <small class="form-hint">HTTP/HTTPS link to the source where information about this event was found</small>
      </div>
      
      <div class="form-group">
        <label for="event-dataset-search">Dataset (optional)</label>
        <div class="dataset-select-section">
          <!-- Selected Dataset Display -->
          <div v-if="selectedDataset" class="selected-tags">
            <div class="selected-tag dataset-chip">
              {{ selectedDataset.filename }} ({{ selectedDataset.event_count }} events)
              <button 
                type="button" 
                @click="clearDataset"
                class="remove-tag-btn"
                aria-label="Clear dataset"
              >
                ×
              </button>
            </div>
          </div>

          <!-- Dataset Search -->
          <div class="tag-input-section">
            <input 
              id="event-dataset-search"
              v-model="formData.datasetSearch"
              type="text"
              class="tag-search-input"
              :placeholder="selectedDataset ? 'Search to change dataset...' : 'Search datasets...'"
              @focus="datasetSuggestionsOpen = true"
              @blur="datasetSuggestionsOpen = false"
            />

            <!-- Dataset Suggestions -->
            <div v-if="datasetSuggestionsOpen && filteredDatasetsList.length > 0" class="tag-suggestions">
              <div class="tag-count-info">{{ filteredDatasetsList.length }} dataset{{ filteredDatasetsList.length !== 1 ? 's' : '' }} found</div>
              <div 
                v-for="dataset in filteredDatasetsList" 
                :key="dataset.id"
                class="tag-suggestion"
                @mousedown.prevent="selectDataset(dataset)"
              >
                {{ dataset.filename }}
                <span class="tag-event-count">({{ dataset.event_count }} events)</span>
              </div>
            </div>
            <div v-else-if="datasetSuggestionsOpen && formData.datasetSearch && filteredDatasetsList.length === 0" class="tag-suggestions">
              <div class="tag-count-info">No matching datasets</div>
            </div>
          </div>
        </div>
        <small class="form-hint">Optionally assign this event to an existing dataset for organization</small>
      </div>
      
      <!-- Tags Section -->
      <div class="form-group">
        <label for="event-tags">Tags</label>
        <div class="tags-section">
          <!-- Selected Tags Display -->
          <div v-if="formData.selectedTags && formData.selectedTags.length > 0" class="selected-tags">
            <div 
              v-for="tag in formData.selectedTags" 
              :key="tag.id"
              class="selected-tag"
              :style="getTagStyle(tag)"
            >
              {{ tag.name }}
              <button 
                type="button" 
                @click="removeTag(tag)"
                class="remove-tag-btn"
                :style="{ color: getContrastColor(tag.color) }"
              >
                ×
              </button>
            </div>
          </div>
          
          <!-- Tag Search and Add -->
          <div class="tag-input-section">
            <input 
              v-model="formData.tagSearch"
              type="text"
              class="tag-search-input"
              placeholder="Search tags or type new tag name..."
              @keydown.enter.prevent="handleTagInput"
            />
            
            <!-- Tag Suggestions -->
            <div v-if="filteredTagsList && filteredTagsList.length > 0 && formData.tagSearch" class="tag-suggestions">
              <div class="tag-count-info">{{ filteredTagsList.length }} tag{{ filteredTagsList.length !== 1 ? 's' : '' }} found</div>
              <div 
                v-for="tag in filteredTagsList" 
                :key="tag.id"
                class="tag-suggestion"
                @click="addTag(tag)"
              >
                <span 
                  class="tag-color-indicator"
                  :style="{ backgroundColor: tag.color }"
                ></span>
                {{ tag.name }}
                <span v-if="tag.event_count" class="tag-event-count">({{ tag.event_count }})</span>
              </div>
              <!-- Create new tag option at bottom of suggestions -->
              <div v-if="canCreateNewTag" class="tag-suggestion create-new-suggestion" @click="createAndAddTag">
                <span class="tag-color-indicator" :style="{ backgroundColor: formData.newTagColor }"></span>
                Create "{{ formData.tagSearch }}"
                <input 
                  v-model="formData.newTagColor"
                  type="color"
                  class="inline-color-picker"
                  @click.stop
                />
              </div>
            </div>
            
            <!-- Create New Tag Option -->
            <div v-if="canCreateNewTag && (!filteredTagsList || !filteredTagsList.length)" class="new-tag-option">
              <div class="new-tag-form">
                <span class="new-tag-text">Create new tag:</span>
                <input 
                  v-model="formData.newTagColor"
                  type="color"
                  class="color-picker"
                />
                <button 
                  type="button"
                  @click="createAndAddTag"
                  class="create-tag-btn"
                >
                  Add "{{ formData.tagSearch }}"
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <div class="left-actions">
          <button v-if="isEditing" type="button" @click="handleDelete" class="delete-btn">
            Delete Event
          </button>
        </div>
        <div class="right-actions">
          <button type="button" @click="handleCancel" class="cancel-btn">Cancel</button>
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event') }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useTags } from '@/composables/useTags.js'
import { useLocale } from '@/composables/useLocale.js'
import { getAvailableLensTypes } from '@/utils/event-utils.js'
import { getContrastColor, getTagStyle } from '@/utils/color-utils.js'
import apiService from '@/services/api.js'

export default {
  name: 'EventForm',
  props: {
    event: {
      type: Object,
      default: null
    },
    initialLatitude: {
      type: Number,
      default: null
    },
    initialLongitude: {
      type: Number,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    pinMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit', 'cancel', 'delete', 'toggle-pin'],
  setup(props, { emit }) {
    const { allTags, loadTags } = useTags()
    const { t } = useLocale()
    
    const activeLocaleTab = ref('en')
    const datasets = ref([])
    
    const getDefaultFormData = () => ({
      name_en: '',
      name_ru: '',
      description_en: '',
      description_ru: '',
      date_display: '',
      date: '',
      era: 'AD',
      latitude: props.initialLatitude || null,
      longitude: props.initialLongitude || null,
      lens_type: 'historic',
      source: '',
      dataset_id: null,
      datasetSearch: '',
      selectedTags: [],
      tagSearch: '',
      newTagColor: '#3B82F6'
    })
    
    const formData = ref(getDefaultFormData())
    const datasetSuggestionsOpen = ref(false)
    
    const isEditing = computed(() => !!props.event)
    
    const populateFormFromEvent = (event) => {
      if (!event) return
      
      let dateDisplay = ''
      if (event.event_date) {
        const dateStr = event.event_date.toString()
        
        if (dateStr.includes('-')) {
          let year, month, day
          
          if (dateStr.startsWith('-')) {
            const cleanStr = dateStr.substring(1)
            const parts = cleanStr.split('-')
            
            if (parts.length >= 3) {
              year = parseInt(parts[0])
              month = parseInt(parts[1])
              day = parseInt(parts[2].split('T')[0])
            }
          } else {
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
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            dateDisplay = `${day}/${month}/${year}`
          }
        }
      }
      
      formData.value = {
        name_en: event.name_en || event.name || '',
        name_ru: event.name_ru || '',
        description_en: event.description_en || event.description || '',
        description_ru: event.description_ru || '',
        date_display: dateDisplay,
        date: event.event_date,
        era: event.era || 'AD',
        latitude: event.latitude || null,
        longitude: event.longitude || null,
        lens_type: event.lens_type || 'historic',
        source: event.source || '',
        dataset_id: event.dataset_id || null,
        datasetSearch: '',
        selectedTags: event.tags ? [...event.tags] : [],
        tagSearch: '',
        newTagColor: '#3B82F6'
      }
      
      if (dateDisplay) {
        updateEventDate()
      }
    }
    
    watch(() => props.event, (newEvent) => {
      if (newEvent) {
        populateFormFromEvent(newEvent)
      } else {
        formData.value = getDefaultFormData()
      }
    }, { immediate: true })
    
    watch(() => props.initialLatitude, (lat) => {
      if (lat !== null) {
        formData.value.latitude = lat
      }
    }, { immediate: true })
    
    watch(() => props.initialLongitude, (lng) => {
      if (lng !== null) {
        formData.value.longitude = lng
      }
    }, { immediate: true })
    
    const fetchDatasets = async () => {
      try {
        const response = await apiService.getDatasets()
        datasets.value = Array.isArray(response) ? response.filter(d => d && d.id) : []
      } catch (err) {
        console.error('Error fetching datasets:', err)
        datasets.value = []
      }
    }
    
    onMounted(async () => {
      await loadTags()
      await fetchDatasets()
    })
    
    const filteredTagsList = computed(() => {
      if (!allTags.value || !formData.value.tagSearch) return []
      const searchTerm = formData.value.tagSearch.toLowerCase()
      return allTags.value
        .filter(tag => 
          tag.name.toLowerCase().includes(searchTerm) &&
          !formData.value.selectedTags.some(selected => selected.id === tag.id)
        )
        .sort((a, b) => (b.event_count || 0) - (a.event_count || 0) || a.name.localeCompare(b.name))
    })
    
    const selectedDataset = computed(() => {
      if (!formData.value.dataset_id) return null
      return datasets.value.find(d => d.id === formData.value.dataset_id) || null
    })
    
    const filteredDatasetsList = computed(() => {
      const searchTerm = (formData.value.datasetSearch || '').toLowerCase().trim()
      const list = searchTerm
        ? datasets.value.filter(d => d.filename.toLowerCase().includes(searchTerm))
        : datasets.value
      return [...list].sort((a, b) => a.filename.localeCompare(b.filename))
    })
    
    const selectDataset = (dataset) => {
      formData.value.dataset_id = dataset.id
      formData.value.datasetSearch = ''
      datasetSuggestionsOpen.value = false
    }
    
    const clearDataset = () => {
      formData.value.dataset_id = null
      formData.value.datasetSearch = ''
    }
    
    const canCreateNewTag = computed(() => {
      if (!formData.value.tagSearch) return false
      const searchTerm = formData.value.tagSearch.toLowerCase()
      return !allTags.value.some(tag => tag.name.toLowerCase() === searchTerm)
    })
    
    const addTag = (tag) => {
      if (!formData.value.selectedTags.some(selected => selected.id === tag.id)) {
        formData.value.selectedTags.push(tag)
      }
      formData.value.tagSearch = ''
    }
    
    const removeTag = (tagToRemove) => {
      formData.value.selectedTags = formData.value.selectedTags.filter(
        tag => tag.id !== tagToRemove.id
      )
    }
    
    const handleTagInput = () => {
      if (formData.value.tagSearch.trim()) {
        if (filteredTagsList.value.length > 0) {
          addTag(filteredTagsList.value[0])
        } else if (canCreateNewTag.value) {
          createAndAddTag()
        }
      }
    }
    
    const createAndAddTag = async () => {
      if (!formData.value.tagSearch.trim()) return
      
      try {
        const newTag = await apiService.createTag({
          name: formData.value.tagSearch.trim(),
          description: `Auto-generated tag for ${formData.value.tagSearch.trim()}`,
          color: formData.value.newTagColor
        })
        
        allTags.value.push(newTag)
        formData.value.selectedTags.push(newTag)
        formData.value.tagSearch = ''
        formData.value.newTagColor = '#3B82F6'
      } catch (err) {
        console.error('Error creating tag:', err)
      }
    }
    
    const updateEventDate = () => {
      const dateDisplay = formData.value.date_display
      if (dateDisplay && dateDisplay.match(/^\d{2}\/\d{2}\/\d{1,4}$/)) {
        const [day, month, year] = dateDisplay.split('/')
        const paddedYear = year.padStart(4, '0')
        formData.value.date = `${paddedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    
    
    const handleSubmit = () => {
      updateEventDate()
      
      if (!formData.value.date) {
        return
      }
      
      const name_en = formData.value.name_en || ''
      const name_ru = formData.value.name_ru || ''
      const description_en = formData.value.description_en || ''
      const description_ru = formData.value.description_ru || ''
      
      const eventData = {
        name: name_en,
        description: description_en,
        name_en: name_en,
        name_ru: name_ru,
        description_en: description_en,
        description_ru: description_ru,
        event_date: formData.value.date,
        era: formData.value.era,
        latitude: formData.value.latitude,
        longitude: formData.value.longitude,
        lens_type: formData.value.lens_type,
        source: formData.value.source || null,
        dataset_id: formData.value.dataset_id || null,
        tag_ids: formData.value.selectedTags.map(tag => tag.id)
      }
      
      emit('submit', eventData)
    }
    
    const handleCancel = () => {
      emit('cancel')
    }
    
    const handleDelete = () => {
      emit('delete')
    }
    
    return {
      t,
      activeLocaleTab,
      formData,
      datasets,
      isEditing,
      selectedDataset,
      filteredDatasetsList,
      datasetSuggestionsOpen,
      selectDataset,
      clearDataset,
      filteredTagsList,
      canCreateNewTag,
      getAvailableLensTypes,
      getContrastColor,
      getTagStyle,
      addTag,
      removeTag,
      handleTagInput,
      createAndAddTag,
      updateEventDate,
      handleSubmit,
      handleCancel,
      handleDelete
    }
  }
}
</script>

<style scoped>
.event-form-container {
  width: 100%;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
}

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

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.coordinates-row {
  align-items: flex-end;
}

.pin-button-group {
  flex: 0 0 auto !important;
  min-width: auto;
}

.pin-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.pin-button:hover {
  border-color: #4f46e5;
  background: #eff6ff;
}

.pin-button.active {
  border-color: #f59e0b;
  background: #fef3c7;
  animation: pin-pulse 1s ease-in-out infinite;
}

@keyframes pin-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

/* Tags Section */
.tags-section {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 10px;
  background: #fafafa;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.remove-tag-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  margin-left: 2px;
  opacity: 0.7;
}

.remove-tag-btn:hover {
  opacity: 1;
}

.dataset-select-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dataset-chip {
  background: #e0e7ff;
  color: #3730a3;
}

.tag-input-section {
  position: relative;
}

.tag-search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.tag-search-input:focus {
  outline: none;
  border-color: #4f46e5;
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.tag-count-info {
  padding: 6px 10px;
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.tag-event-count {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 4px;
}

.tag-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
}

.tag-suggestion:hover {
  background: #f3f4f6;
}

.tag-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.create-new-suggestion {
  border-top: 1px solid #e5e7eb;
  background: #f0fdf4;
  color: #166534;
}

.inline-color-picker {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
}

.new-tag-option {
  margin-top: 10px;
}

.new-tag-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

.new-tag-text {
  font-size: 13px;
  color: #374151;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.create-tag-btn {
  padding: 6px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.create-tag-btn:hover {
  background: #059669;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e5e7eb;
}

.left-actions,
.right-actions {
  display: flex;
  gap: 10px;
}

.cancel-btn,
.submit-btn,
.delete-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  background: #4f46e5;
  color: white;
}

.submit-btn:hover {
  background: #4338ca;
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}
</style>
