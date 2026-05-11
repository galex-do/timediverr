<template>
  <div class="admin-panel">
    <div class="admin-header">
      <div class="admin-title">
        <h2>{{ t('adminTagsTitle') }}</h2>
        <p class="admin-subtitle">{{ t('adminTagsSubtitle') }}</p>
      </div>
      <div class="action-buttons" v-if="canAccessAdmin">
        <button @click="showCreateModal = true" class="create-btn">
          <span class="btn-icon">➕</span>
          {{ t('createNewTag') }}
        </button>
      </div>
    </div>

    <!-- Tags Table -->
    <div class="table-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading tags...</p>
      </div>
      
      <!-- Table Controls & Pagination -->
      <div v-if="!loading && totalTags > 0" class="table-controls">
        <div class="table-filters">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search tags..."
            class="search-input"
          />
        </div>
        <TablePagination 
          :current-page="currentPage"
          :page-size="pageSize"
          :total-items="filteredTotalTags"
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
            <th>{{ t('columnColor') }}</th>
            <th 
              class="sortable-header" 
              @click="toggleSort('created_at')"
              :class="{ 'active': sortField === 'created_at' }"
            >
              {{ t('columnCreated') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'created_at'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th 
              class="sortable-header" 
              @click="toggleSort('weight')"
              :class="{ 'active': sortField === 'weight' }"
            >
              {{ t('columnWeight') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'weight'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th 
              class="sortable-header" 
              @click="toggleSort('usage_count')"
              :class="{ 'active': sortField === 'usage_count' }"
            >
              {{ t('columnUsageCount') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'usage_count'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th>{{ t('columnActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in currentPageTags" :key="tag.id" class="event-row">
            <td class="tag-name">{{ tag.name }}</td>
            <td class="tag-description">
              <span class="description-text" :title="tag.description">
                {{ tag.description && tag.description.length > 100 ? tag.description.substring(0, 100) + '...' : tag.description || 'No description' }}
              </span>
            </td>
            <td class="tag-color-cell">
              <div class="color-preview">
                <span 
                  class="color-swatch"
                  :style="{ backgroundColor: tag.color }"
                ></span>
                <span class="color-code">{{ tag.color }}</span>
              </div>
            </td>
            <td class="tag-created">{{ formatDate(tag.created_at) }}</td>
            <td class="tag-weight">{{ tag.weight }}</td>
            <td class="tag-usage">
              <span 
                v-if="getTagUsageCount(tag.id) > 0"
                class="usage-link"
                @click="navigateToEventsWithTag(tag)"
                :title="`View ${getTagUsageCount(tag.id)} events with tag '${tag.name}'`"
              >
                {{ getTagUsageCount(tag.id) }} events
              </span>
              <span v-else class="usage-count-zero">0 events</span>
            </td>
            <td class="tag-actions">
              <div class="actions-wrapper">
                <button @click="editTag(tag)" class="action-btn edit-btn" title="Edit">
                  ✏️
                </button>
                <button @click="deleteTag(tag)" class="action-btn delete-btn" title="Delete" :disabled="getTagUsageCount(tag.id) > 0">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="!loading && totalTags === 0" class="empty-state">
        <p>No tags found. Create your first tag!</p>
      </div>
      
      <div v-if="!loading && totalTags > 0 && filteredTags.length === 0" class="empty-state">
        <p>No tags match your search criteria.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content admin-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ editingTag ? 'Edit Tag' : 'Create New Tag' }}</h3>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div v-if="error" class="error-message">{{ error }}</div>
            
            <form @submit.prevent="saveTag">
              <div class="form-group">
                <label for="tag-name">Tag Name *</label>
                <input 
                  id="tag-name"
                  v-model="tagForm.name" 
                  type="text" 
                  required 
                  class="form-input"
                  placeholder="Enter tag name"
                />
              </div>
              
              <div class="form-group">
                <label for="tag-description">Description</label>
                <textarea 
                  id="tag-description"
                  v-model="tagForm.description" 
                  class="form-textarea"
                  placeholder="Enter tag description (optional)"
                  rows="3"
                ></textarea>
              </div>
              
              <div class="form-group">
                <label for="tag-color">Color *</label>
                <div class="color-input-container">
                  <input 
                    id="tag-color"
                    v-model="tagForm.color" 
                    type="color" 
                    required 
                    class="color-input"
                  />
                  <input 
                    v-model="tagForm.color" 
                    type="text" 
                    class="form-input color-text-input"
                    placeholder="#3B82F6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                  <div 
                    class="color-preview-large"
                    :style="{ backgroundColor: tagForm.color }"
                  ></div>
                </div>
              </div>

              <div class="form-group">
                <label for="tag-border-color">Border Color (optional)</label>
                <div class="color-input-container">
                  <input 
                    id="tag-border-color"
                    v-model="tagForm.border_color" 
                    type="color"
                    class="color-input"
                    :disabled="!tagForm.has_border"
                  />
                  <input 
                    v-model="tagForm.border_color" 
                    type="text" 
                    class="form-input color-text-input"
                    placeholder="No border"
                    :disabled="!tagForm.has_border"
                  />
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      v-model="tagForm.has_border"
                    />
                    <span class="toggle-track"></span>
                    <span class="toggle-text">Enable</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>Key Color</label>
                <div class="key-color-toggle">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      v-model="tagForm.key_color"
                    />
                    <span class="toggle-track"></span>
                    <span class="toggle-text">Show colored marker on timeline/clusters</span>
                  </label>
                  <span v-if="tagForm.key_color" class="key-color-preview">
                    <span class="key-color-dot" :style="{ backgroundColor: tagForm.color }"></span>
                    Preview
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label for="tag-emoji">{{ t('tagEmoji') }}</label>
                <div class="emoji-input-container">
                  <div class="emoji-selected" @click="showEmojiPicker = !showEmojiPicker">
                    <span v-if="tagForm.emoji" class="emoji-preview">{{ tagForm.emoji }}</span>
                    <span v-else class="emoji-placeholder">{{ t('tagEmojiPlaceholder') }}</span>
                  </div>
                  <button v-if="tagForm.emoji" type="button" class="emoji-clear-btn" @click="tagForm.emoji = ''">✕</button>
                </div>
                <div v-if="showEmojiPicker" class="emoji-picker">
                  <div 
                    v-for="group in emojiGroups" 
                    :key="group.label" 
                    class="emoji-group"
                  >
                    <div class="emoji-group-label">{{ group.label }}</div>
                    <div class="emoji-grid">
                      <button 
                        v-for="em in group.emojis" 
                        :key="em"
                        type="button"
                        class="emoji-option"
                        :class="{ selected: tagForm.emoji === em }"
                        @click="tagForm.emoji = em; showEmojiPicker = false"
                      >{{ em }}</button>
                    </div>
                  </div>
                </div>
                <span class="form-hint">{{ t('tagEmojiHint') }}</span>
              </div>

              <div class="form-group">
                <label for="tag-weight">{{ t('columnWeight') }}</label>
                <input 
                  id="tag-weight"
                  v-model.number="tagForm.weight" 
                  type="number" 
                  min="1"
                  class="form-input weight-input"
                  placeholder="1"
                />
                <span class="form-hint">{{ t('weightHint') }}</span>
              </div>
              
              <div class="form-actions">
                <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
                <button type="submit" class="submit-btn" :disabled="localLoading">
                  {{ localLoading ? 'Saving...' : (editingTag ? 'Update Tag' : 'Create Tag') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'
import { useTags } from '@/composables/useTags.js'
import { useEvents } from '@/composables/useEvents.js'
import { useLocale } from '@/composables/useLocale.js'
import apiService from '@/services/api.js'
import TablePagination from '@/components/TablePagination.vue'

export default {
  name: 'AdminTags',
  components: {
    TablePagination
  },
  setup() {
    const router = useRouter()
    const { canAccessAdmin } = useAuth()
    const { allTags, loadTags, refreshTags, createTag } = useTags()
    const { events } = useEvents()
    const { t } = useLocale()
    
    const localLoading = ref(false)
    const localError = ref(null)
    const searchQuery = ref('')
    const showEmojiPicker = ref(false)

    const emojiGroups = [
      { label: '🏛️ History & Politics', emojis: ['🏛️', '👑', '⚔️', '🛡️', '🏰', '🗡️', '📜', '📖', '🏺', '🗿', '⚖️', '🎖️', '🏴', '🚩'] },
      { label: '🏙️ Cities & Settlement', emojis: ['🏙️', '🏘️', '🏠', '🏗️', '🏚️', '🛖', '⛺', '🏕️', '🧱', '🪵', '🏢', '🕌', '⛩️', '🗼'] },
      { label: '🚢 Exploration & Colonization', emojis: ['🚢', '⛵', '🧭', '🗺️', '⚓', '🏴‍☠️', '🛶', '🐪', '🛤️', '🌐', '🏳️', '📍', '🔭', '🪂'] },
      { label: '🌍 Geography & Nature', emojis: ['🌍', '🏔️', '🌋', '🏝️', '🌊', '🏜️', '🌲', '🐘', '🦁', '🐉', '🌾', '💎', '⛏️', '🪨'] },
      { label: '🎭 Culture & Religion', emojis: ['🎭', '🎨', '🎵', '📚', '🏟️', '⛪', '🕌', '🕍', '🛕', '☪️', '✝️', '☸️', '🔯', '🙏'] },
      { label: '🔬 Science & Tech', emojis: ['🔬', '⚗️', '💡', '⚙️', '🧬', '🧪', '📡', '🚀', '🛸', '⏳', '🔋', '💻', '🔧', '🏭'] },
      { label: '💰 Economy & Trade', emojis: ['💰', '🪙', '🏦', '📊', '🤝', '🎪', '🍷', '🧵', '🛒', '📦', '🏪', '🛳️', '🐑', '🌽'] },
      { label: '💀 Disasters & War', emojis: ['💀', '☠️', '🔥', '💣', '🩸', '⚰️', '🌪️', '☄️', '🦠', '⚠️', '🚨', '💥', '🌑', '🏴'] },
      { label: '👤 People & Symbols', emojis: ['👤', '👥', '🧙', '🤴', '👸', '🗣️', '✊', '🕊️', '🏆', '🎯', '⭐', '❤️', '🔱', '⚜️'] }
    ]
    
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const editingTag = ref(null)
    
    // Sorting state
    const sortField = ref('name')
    const sortDirection = ref('asc')
    
    // Pagination state
    const currentPage = ref(1)
    const pageSize = ref(10)
    
    const tagForm = ref({
      name: '',
      description: '',
      color: '#3B82F6',
      border_color: '#000000',
      has_border: false,
      key_color: false,
      emoji: '',
      weight: 1
    })

    // Pre-computed usage counts cache (O(n) instead of O(n*m) per sort)
    const tagUsageCountsMap = computed(() => {
      const counts = new Map()
      if (!events.value || !Array.isArray(events.value)) return counts
      
      for (const event of events.value) {
        if (event.tags && Array.isArray(event.tags)) {
          for (const tag of event.tags) {
            counts.set(tag.id, (counts.get(tag.id) || 0) + 1)
          }
        }
      }
      return counts
    })

    // Filtered and sorted tags
    const filteredTags = computed(() => {
      if (!allTags.value || !Array.isArray(allTags.value)) {
        return []
      }
      
      let filtered = allTags.value
      
      // Apply search filter
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(tag => 
          tag.name.toLowerCase().includes(query) ||
          (tag.description && tag.description.toLowerCase().includes(query))
        )
      }
      
      // Apply sorting
      return [...filtered].sort((a, b) => {
        let aValue, bValue
        
        if (sortField.value === 'created_at') {
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
        } else if (sortField.value === 'usage_count') {
          aValue = tagUsageCountsMap.value.get(a.id) || 0
          bValue = tagUsageCountsMap.value.get(b.id) || 0
        } else if (sortField.value === 'weight') {
          aValue = a.weight || 1
          bValue = b.weight || 1
        } else {
          aValue = a[sortField.value] || ''
          bValue = b[sortField.value] || ''
          if (typeof aValue === 'string') aValue = aValue.toLowerCase()
          if (typeof bValue === 'string') bValue = bValue.toLowerCase()
        }
        
        if (sortDirection.value === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
    })
    
    const filteredTotalTags = computed(() => filteredTags.value.length)
    const totalTags = computed(() => allTags.value?.length || 0)
    
    // Current page of filtered tags
    const currentPageTags = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredTags.value.slice(start, end)
    })

    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch {
        return 'Invalid Date'
      }
    }

    const getTagUsageCount = (tagId) => {
      return tagUsageCountsMap.value.get(tagId) || 0
    }
    
    const navigateToEventsWithTag = (tag) => {
      // Navigate to admin/events page with tag pre-selected
      router.push({
        path: '/admin/events',
        query: { tag: tag.id }
      })
    }

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

    const editTag = (tag) => {
      editingTag.value = tag
      tagForm.value = {
        name: tag.name,
        description: tag.description || '',
        color: tag.color,
        border_color: tag.border_color || '#000000',
        has_border: !!tag.border_color,
        key_color: !!tag.key_color,
        emoji: tag.emoji || '',
        weight: tag.weight || 1
      }
      showEditModal.value = true
    }

    const deleteTag = async (tag) => {
      const usageCount = getTagUsageCount(tag.id)
      if (usageCount > 0) {
        alert(`Cannot delete tag "${tag.name}" because it is used by ${usageCount} event(s). Remove it from all events first.`)
        return
      }

      const confirmed = confirm(`Are you sure you want to delete the tag "${tag.name}"? This action cannot be undone.`)
      if (!confirmed) return
      
      localLoading.value = true
      localError.value = null
      try {
        await apiService.deleteTag(tag.id)
        await loadTags() // Refresh tags list
        console.log('Tag deleted successfully')
      } catch (err) {
        console.error('Error deleting tag:', err)
        localError.value = err.message || 'Failed to delete tag'
      } finally {
        localLoading.value = false
      }
    }

    const saveTag = async () => {
      localLoading.value = true
      localError.value = null
      
      try {
        const payload = {
          name: tagForm.value.name,
          description: tagForm.value.description,
          color: tagForm.value.color,
          weight: tagForm.value.weight,
          border_color: tagForm.value.has_border ? tagForm.value.border_color : null,
          clear_border_color: !tagForm.value.has_border,
          key_color: tagForm.value.key_color,
          emoji: tagForm.value.emoji.trim() || null,
          clear_emoji: !tagForm.value.emoji.trim()
        }
        if (editingTag.value) {
          await apiService.updateTag(editingTag.value.id, payload)
        } else {
          await apiService.createTag(payload)
        }
        
        await loadTags() // Refresh tags list
        closeModal()
        console.log('Tag saved successfully')
      } catch (err) {
        console.error('Error saving tag:', err)
        localError.value = err.message || 'Failed to save tag'
      } finally {
        localLoading.value = false
      }
    }

    const closeModal = () => {
      showCreateModal.value = false
      showEditModal.value = false
      editingTag.value = null
      tagForm.value = {
        name: '',
        description: '',
        color: '#3B82F6',
        border_color: '#000000',
        has_border: false,
        key_color: false,
        emoji: '',
        weight: 1
      }
      localError.value = null
      showEmojiPicker.value = false
    }

    // Load initial data — always fetch fresh so tags created during a dataset
    // import are visible immediately after navigating here.
    onMounted(async () => {
      try {
        await refreshTags()
      } catch (err) {
        console.error('Error loading tags:', err)
        localError.value = 'Failed to load tags'
      }
    })

    return {
      canAccessAdmin,
      loading: computed(() => localLoading.value),
      error: computed(() => localError.value),
      showCreateModal,
      showEditModal,
      editingTag,
      tagForm,
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      totalTags,
      filteredTags,
      filteredTotalTags,
      currentPageTags,
      formatDate,
      getTagUsageCount,
      navigateToEventsWithTag,
      toggleSort,
      handlePageChange,
      handlePageSizeChange,
      editTag,
      deleteTag,
      saveTag,
      closeModal,
      localLoading,
      showEmojiPicker,
      emojiGroups,
      t
    }
  }
}
</script>

<style scoped>
/* Reuse most styles from AdminEvents.vue */
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
  overflow: hidden;
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

.search-input {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  width: 300px;
  max-width: 100%;
}

.search-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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

.tag-name {
  font-weight: 600;
  color: #2d3748;
}

.tag-description {
  max-width: 300px;
}

.description-text {
  color: #4a5568;
  line-height: 1.4;
}

.tag-color-cell {
  min-width: 120px;
}

.color-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e2e8f0;
  display: block;
}

.color-code {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.8rem;
  color: #6b7280;
}

.tag-created {
  color: #4a5568;
  font-size: 0.875rem;
}

.tag-weight {
  color: #4a5568;
  font-size: 0.875rem;
  text-align: center;
  font-weight: 600;
}

.weight-input {
  width: 80px;
}

.emoji-input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.emoji-selected {
  width: 48px;
  height: 48px;
  border: 2px solid #d1d5db;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s;
  background: white;
}

.emoji-selected:hover {
  border-color: #4f46e5;
}

.emoji-preview {
  font-size: 1.6rem;
  line-height: 1;
}

.emoji-placeholder {
  font-size: 1.4rem;
  opacity: 0.3;
}

.emoji-clear-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
}

.emoji-clear-btn:hover {
  color: #ef4444;
}

.emoji-picker {
  margin-top: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: white;
  max-height: 250px;
  overflow-y: auto;
}

.emoji-group {
  margin-bottom: 0.5rem;
}

.emoji-group:last-child {
  margin-bottom: 0;
}

.emoji-group-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.emoji-option {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: 2px solid transparent;
  border-radius: 0.375rem;
  background: none;
  cursor: pointer;
  transition: all 0.15s;
}

.emoji-option:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.emoji-option.selected {
  background: #eef2ff;
  border-color: #4f46e5;
}

.form-hint {
  display: block;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.tag-usage {
  color: #6b7280;
  font-size: 0.875rem;
}

.usage-link {
  color: #4f46e5;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  border-bottom: 1px solid transparent;
}

.usage-link:hover {
  color: #5a67d8;
  border-bottom-color: #5a67d8;
}

.usage-count-zero {
  color: #9ca3af;
}

.tag-actions {
  vertical-align: middle;
  text-align: center;
}

.tag-actions .actions-wrapper {
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
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover:not(:disabled) {
  background: #fde68a;
  transform: scale(1.1);
}

.delete-btn {
  background: #fef2f2;
  color: #dc2626;
}

.delete-btn:hover:not(:disabled) {
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
}

.admin-modal {
  max-width: 500px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #9ca3af;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #6b7280;
}

.modal-body {
  padding: 0 1.5rem 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.color-input-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-input {
  width: 3rem;
  height: 3rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  padding: 0;
}

.color-text-input {
  flex: 1;
  max-width: 200px;
}

.color-preview-large {
  width: 3rem;
  height: 3rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.cancel-btn,
.submit-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.85rem;
  color: #4a5568;
}

.toggle-switch input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.toggle-track {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  background: #cbd5e1;
  border-radius: 10px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-track::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-track {
  background: #4f46e5;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-track::after {
  transform: translateX(16px);
}

.toggle-text {
  user-select: none;
}

.key-color-toggle {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.key-color-preview {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
}

.key-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  border: 1px solid #fecaca;
}

@media (max-width: 1024px) {
  .admin-panel {
    padding: 1rem;
  }
  
  .admin-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>