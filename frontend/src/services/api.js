/**
 * API service for backend communication
 */

import authService from './authService.js'
import { useLocale } from '@/composables/useLocale.js'
import {
  cache_get,
  cache_set,
  cache_invalidate,
  cache_invalidate_events,
  CACHE_TTL,
} from '@/utils/client-cache.js'

class ApiService {
  constructor() {
    this.baseURL = this.getBackendUrl()
  }

  // Helper method to add locale parameter to URLs for event-related endpoints
  addLocaleToEventUrl(url) {
    const { getLocaleParam } = useLocale()
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${getLocaleParam()}`
  }

  getBackendUrl() {
    // Use relative URL - Vite proxy or nginx will route to backend
    return '/api'
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`
      console.log(`Making API request to: ${url}`)
      
      // Get authentication headers
      const authHeaders = authService.getHeaders()
      
      const response = await fetch(url, {
        headers: {
          ...authHeaders,
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status} for ${url}`)
        
        // Try to extract error message from response body
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.text()
          if (errorData) {
            // If response is plain text (like our validation messages), use it directly
            errorMessage = errorData
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      console.log(`API response for ${endpoint}:`, responseData)
      
      // Handle both new standardized format and legacy format
      return responseData.data || responseData
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error.message || error)
      throw error
    }
  }

  // Events API
  //
  // By default this returns the lean list shape (no descriptions, tags as
  // bare IDs) used to populate the map — see backend models.EventListItem.
  // Pass includeDescriptions=true (used by the admin table) to get full
  // descriptions/source embedded inline instead of fetching them separately.
  async getEvents(page = null, limit = null, sortField = null, sortDirection = null, includeDescriptions = false) {
    let endpoint = '/events'
    const is_paginated = page !== null && limit !== null

    if (is_paginated) {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (sortField)     params.append('sort', sortField)
      if (sortDirection) params.append('order', sortDirection)
      endpoint = `/events?${params}`
    }

    if (includeDescriptions) {
      endpoint += endpoint.includes('?') ? '&' : '?'
      endpoint += 'include_descriptions=true'
    }

    endpoint = this.addLocaleToEventUrl(endpoint)

    // Client-side cache only for the non-paginated map request (admin table bypasses it)
    if (!is_paginated) {
      const { getLocaleParam } = useLocale()
      const locale = getLocaleParam().replace('locale=', '') || 'en'
      const cache_key = includeDescriptions ? `events:${locale}:full` : `events:${locale}`

      const cached = cache_get(cache_key)
      if (cached) {
        console.log(`[cache] HIT ${cache_key} (client localStorage)`)
        return cached
      }

      const data = await this.makeRequest(endpoint)
      cache_set(cache_key, data, CACHE_TTL.events)
      console.log(`[cache] MISS ${cache_key} — stored in localStorage for ${CACHE_TTL.events / 60000} min`)
      return data
    }

    return this.makeRequest(endpoint)
  }

  // Fetch full event records (description, source, full tag objects) for a
  // specific set of event IDs in one request. Used to lazily fill in details
  // for events that were loaded via the lean list.
  async getEventsBatch(ids) {
    if (!ids || ids.length === 0) return []
    const params = new URLSearchParams({ ids: ids.join(',') })
    let endpoint = `/events/batch?${params}`
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  async createEvent(eventData) {
    const endpoint = this.addLocaleToEventUrl('/events')
    const result = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(eventData),
    })
    cache_invalidate_events()
    return result
  }

  async updateEvent(eventId, eventData) {
    const endpoint = this.addLocaleToEventUrl(`/events/${eventId}`)
    const result = await this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    })
    cache_invalidate_events()
    return result
  }

  async deleteEvent(eventId) {
    const endpoint = this.addLocaleToEventUrl(`/events/${eventId}`)
    const result = await this.makeRequest(endpoint, { method: 'DELETE' })
    cache_invalidate_events()
    return result
  }

  async getEventById(id) {
    const endpoint = this.addLocaleToEventUrl(`/events/${id}`)
    return this.makeRequest(endpoint)
  }

  async getEventsInBBox(minLat, minLng, maxLat, maxLng) {
    const params = new URLSearchParams({
      min_lat: minLat,
      min_lng: minLng,
      max_lat: maxLat,
      max_lng: maxLng,
    })
    let endpoint = `/events/bbox?${params}`
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  // Template API
  async getTemplateGroups() {
    let endpoint = '/date-template-groups'
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  async getTemplatesByGroup(groupId) {
    let endpoint = `/date-templates/${groupId}`
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  async getAllTemplates() {
    let endpoint = '/date-templates'
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  async getTemplateById(id) {
    let endpoint = `/date-templates/single/${id}`
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  async createTemplate(templateData) {
    return this.makeRequest('/date-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    })
  }

  async updateTemplate(id, templateData) {
    return this.makeRequest(`/date-templates/single/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    })
  }

  async deleteTemplate(id) {
    return this.makeRequest(`/date-templates/single/${id}`, {
      method: 'DELETE',
    })
  }

  async getTemplateGroupById(id) {
    let endpoint = `/date-template-groups/${id}`
    endpoint = this.addLocaleToEventUrl(endpoint)
    return this.makeRequest(endpoint)
  }

  async createTemplateGroup(groupData) {
    return this.makeRequest('/date-template-groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    })
  }

  async updateTemplateGroup(id, groupData) {
    return this.makeRequest(`/date-template-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    })
  }

  async deleteTemplateGroup(id) {
    return this.makeRequest(`/date-template-groups/${id}`, {
      method: 'DELETE',
    })
  }

  // Tags API
  async getTags() {
    const cached = cache_get('tags')
    if (cached) {
      console.log('[cache] HIT tags (client localStorage)')
      return cached
    }
    const data = await this.makeRequest('/tags')
    cache_set('tags', data, CACHE_TTL.tags)
    console.log(`[cache] MISS tags — stored in localStorage for ${CACHE_TTL.tags / 60000} min`)
    return data
  }

  async createTag(tagData) {
    const result = await this.makeRequest('/tags', {
      method: 'POST',
      body: JSON.stringify(tagData),
    })
    cache_invalidate('tags')
    cache_invalidate_events()
    return result
  }

  async updateTag(id, tagData) {
    const result = await this.makeRequest(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tagData),
    })
    cache_invalidate('tags')
    cache_invalidate_events()
    return result
  }

  async deleteTag(id) {
    const result = await this.makeRequest(`/tags/${id}`, { method: 'DELETE' })
    cache_invalidate('tags')
    cache_invalidate_events()
    return result
  }

  async setEventTags(eventId, tagIds) {
    const result = await this.makeRequest(`/events/${eventId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tag_ids: tagIds }),
    })
    cache_invalidate_events()
    cache_invalidate('tags')
    return result
  }

  async addTagToEvent(eventId, tagId) {
    const result = await this.makeRequest(`/events/${eventId}/tags/${tagId}`, {
      method: 'POST',
    })
    cache_invalidate_events()
    cache_invalidate('tags')
    return result
  }

  async removeTagFromEvent(eventId, tagId) {
    const result = await this.makeRequest(`/events/${eventId}/tags/${tagId}`, {
      method: 'DELETE',
    })
    cache_invalidate_events()
    cache_invalidate('tags')
    return result
  }

  async importEvents(events, filename = '') {
    const result = await this.makeRequest('/events/import', {
      method: 'POST',
      body: JSON.stringify({ events, filename }),
    })
    cache_invalidate_events()
    return result
  }

  // Dataset operations
  async getDatasets() {
    return this.makeRequest('/datasets')
  }

  async createDataset(datasetData) {
    return this.makeRequest('/datasets', {
      method: 'POST',
      body: JSON.stringify(datasetData),
    })
  }

  async deleteDataset(id) {
    return this.makeRequest(`/datasets/${id}`, {
      method: 'DELETE',
    })
  }

  async exportDataset(id) {
    return this.makeRequest(`/datasets/${id}/export`, {
      method: 'GET',
    })
  }

  async resetDatasetModified(id) {
    return this.makeRequest(`/datasets/${id}/reset-modified`, {
      method: 'POST',
    })
  }

  // User management API
  async getUsers() {
    return this.makeRequest('/users')
  }

  async createUser(userData) {
    return this.makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(userId, userData) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(userId) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'DELETE',
    })
  }

  // Regions API
  async getRegionsByTemplate(templateId) {
    return this.makeRequest(`/templates/${templateId}/regions`)
  }

  async getAllRegions() {
    return this.makeRequest('/regions')
  }

  async getRegion(id) {
    return this.makeRequest(`/regions/${id}`)
  }

  async createRegion(data) {
    return this.makeRequest('/regions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRegion(id, data) {
    return this.makeRequest(`/regions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRegion(id) {
    return this.makeRequest(`/regions/${id}`, {
      method: 'DELETE',
    })
  }

  async linkRegionTemplates(regionId, templateIds) {
    return this.makeRequest(`/regions/${regionId}/templates`, {
      method: 'POST',
      body: JSON.stringify({ template_ids: templateIds }),
    })
  }

  async unlinkRegionTemplate(regionId, templateId) {
    return this.makeRequest(`/regions/${regionId}/templates/${templateId}`, {
      method: 'DELETE',
    })
  }
}

// Export singleton instance
export default new ApiService()