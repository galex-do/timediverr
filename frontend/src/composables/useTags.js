import { ref, computed } from 'vue'
import api from '../services/api.js'

const allTags = ref([])
const isLoadingTags = ref(false)
const tagsError = ref(null)
let _loadingPromise = null

export function useTags() {
  // Load all available tags.
  // Concurrent calls share the same in-flight request so they all get the
  // same fresh result rather than the second caller silently returning with
  // stale data.
  const loadTags = async () => {
    if (_loadingPromise) return _loadingPromise

    _loadingPromise = (async () => {
      isLoadingTags.value = true
      tagsError.value = null

      try {
        const response = await api.getTags()

        if (response) {
          const tagsData = response.data || response
          if (Array.isArray(tagsData)) {
            allTags.value = tagsData
          } else {
            console.error('Invalid tags response:', response)
            tagsError.value = 'Invalid response format'
          }
        } else {
          console.error('Invalid tags response:', response)
          tagsError.value = 'Invalid response format'
        }
      } catch (error) {
        console.error('Error loading tags:', error)
        tagsError.value = error.message || 'Failed to load tags'
      } finally {
        isLoadingTags.value = false
        _loadingPromise = null
      }
    })()

    return _loadingPromise
  }

  // Force a fresh fetch regardless of any in-flight request.
  // Use this after operations that create/delete tags (e.g. dataset import)
  // to ensure the caller always sees up-to-date data.
  const refreshTags = async () => {
    _loadingPromise = null
    return loadTags()
  }

  // Create a new tag
  const createTag = async (tagData) => {
    try {
      const response = await api.createTag(tagData)
      
      if (response && response.data) {
        allTags.value.push(response.data)
        return response.data
      } else {
        throw new Error('Invalid response format from tag creation API')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
      // Enhance error message for better user feedback
      if (error.message && error.message.includes('500')) {
        throw new Error('Tag name already exists. Please choose a different name.')
      }
      throw error
    }
  }

  // Update an existing tag
  const updateTag = async (id, tagData) => {
    try {
      const response = await api.updateTag(id, tagData)
      if (response && response.data) {
        const index = allTags.value.findIndex(tag => tag.id === id)
        if (index !== -1) {
          allTags.value[index] = response.data
        }
        return response.data
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      throw error
    }
  }

  // Delete a tag
  const deleteTag = async (id) => {
    try {
      await api.deleteTag(id)
      allTags.value = allTags.value.filter(tag => tag.id !== id)
    } catch (error) {
      console.error('Error deleting tag:', error)
      throw error
    }
  }

  // Set tags for an event
  const setEventTags = async (eventId, tagIds) => {
    try {
      await api.setEventTags(eventId, tagIds)
    } catch (error) {
      console.error('Error setting event tags:', error)
      throw error
    }
  }

  // Get tag by ID
  const getTagById = (id) => {
    return allTags.value.find(tag => tag.id === id)
  }

  // Get tags by IDs
  const getTagsByIds = (ids) => {
    return allTags.value.filter(tag => ids.includes(tag.id))
  }

  return {
    // State
    allTags: computed(() => allTags.value),
    isLoadingTags: computed(() => isLoadingTags.value),
    tagsError: computed(() => tagsError.value),
    
    // Actions
    loadTags,
    refreshTags,
    createTag,
    updateTag,
    deleteTag,
    setEventTags,
    getTagById,
    getTagsByIds
  }
}