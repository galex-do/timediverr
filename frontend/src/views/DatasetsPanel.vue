<template>
  <div class="admin-panel">
    <div class="admin-header">
      <div class="admin-title">
        <h2>{{ t('adminDatasetsTitle') }}</h2>
        <p class="admin-subtitle">{{ t('adminDatasetsSubtitle') }}</p>
      </div>
      <div class="action-buttons">
        <input 
          ref="fileInput"
          type="file" 
          accept=".json"
          @change="handleFileSelect"
          style="display: none"
        >
        <button @click="triggerFileSelect" class="create-btn import-btn" :disabled="localLoading">
          <span class="btn-icon">📤</span>
          {{ t('importDataset') }}
        </button>
        <button @click="openCreateModal" class="create-btn" :disabled="localLoading">
          <span class="btn-icon">➕</span>
          {{ t('createEmptyDataset') }}
        </button>
      </div>
    </div>

    <div v-if="selectedFile" class="import-preview">
      <div class="import-preview-content">
        <span class="file-icon">📄</span>
        <span class="file-name">{{ selectedFile.name }}</span>
        <button @click="importDataset" class="confirm-btn" :disabled="localLoading">
          {{ localLoading ? t('importing') : t('confirmImport') }}
        </button>
        <button @click="clearSelection" class="cancel-btn" :disabled="localLoading">
          {{ t('cancel') }}
        </button>
      </div>
    </div>

    <div class="table-container">
      <div v-if="localLoading && !selectedFile" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('loadingDatasets') }}</p>
      </div>
      
      <div v-if="localError" class="error-state">
        <p class="error-message">{{ localError }}</p>
        <button @click="fetchDatasets" class="retry-btn">{{ t('tryAgain') }}</button>
      </div>

      <div v-if="!localLoading && datasets.length > 0" class="table-controls">
        <div class="table-filters">
          <input 
            v-model="searchQuery"
            type="text"
            :placeholder="t('searchDatasets')"
            class="search-input"
          />
        </div>
        <TablePagination 
          :current-page="currentPage"
          :page-size="pageSize"
          :total-items="filteredDatasets.length"
          @update:current-page="handlePageChange"
          @update:page-size="handlePageSizeChange"
          :show-full-info="true"
        />
      </div>
      
      <table v-if="!localLoading" class="events-table">
        <thead>
          <tr>
            <th 
              class="sortable-header" 
              @click="toggleSort('filename')"
              :class="{ 'active': sortField === 'filename' }"
            >
              {{ t('columnFilename') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'filename'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th>{{ t('columnDescription') }}</th>
            <th 
              class="sortable-header" 
              @click="toggleSort('event_count')"
              :class="{ 'active': sortField === 'event_count' }"
            >
              {{ t('columnEventCount') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'event_count'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th>{{ t('columnUploadedBy') }}</th>
            <th 
              class="sortable-header" 
              @click="toggleSort('created_at')"
              :class="{ 'active': sortField === 'created_at' }"
            >
              {{ t('columnUploadDate') }}
              <span class="sort-indicator">
                <span v-if="sortField === 'created_at'" class="sort-arrow">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
                <span v-else class="sort-placeholder">⇅</span>
              </span>
            </th>
            <th>{{ t('columnActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dataset in currentPageDatasets" :key="dataset.id" class="event-row" :class="{ 'modified-row': dataset.modified }">
            <td class="dataset-filename">
              <div class="filename-cell">
                <span v-if="dataset.modified" class="modified-icon" :title="t('datasetModified')">⚠️</span>
                <span class="filename">{{ dataset.filename }}</span>
              </div>
            </td>
            <td class="dataset-description">
              <span class="description-text" :title="dataset.description">
                {{ dataset.description && dataset.description.length > 80 ? dataset.description.substring(0, 80) + '...' : dataset.description || t('noDescription') }}
              </span>
            </td>
            <td class="dataset-count">
              <span class="count-badge">{{ dataset.event_count }}</span>
            </td>
            <td class="dataset-uploader">
              {{ dataset.uploaded_by_username || `${t('userPrefix')} ${dataset.uploaded_by}` }}
            </td>
            <td class="dataset-date">
              {{ formatDate(dataset.created_at) }}
            </td>
            <td class="dataset-actions">
              <div class="actions-wrapper">
                <button 
                  v-if="dataset.modified"
                  @click="resetModifiedFlag(dataset)"
                  class="action-btn reset-btn"
                  :title="t('resetModifiedTitle')"
                  :disabled="localLoading"
                >
                  ✓
                </button>
                <button 
                  @click="exportDataset(dataset)"
                  class="action-btn export-btn"
                  :title="`${t('exportDatasetTitle')} ${dataset?.filename || t('unknown')}`"
                  :disabled="localLoading"
                >
                  📤
                </button>
                <button 
                  @click="confirmDelete(dataset)"
                  class="action-btn delete-btn"
                  :title="`${t('deleteDatasetTitle')} ${dataset?.filename || t('unknown')}`"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="!localLoading && datasets.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>{{ t('noDatasetsFound') }}</h3>
        <p>{{ t('importToCreateFirst') }}</p>
      </div>
      
      <div v-if="!localLoading && datasets.length > 0 && filteredDatasets.length === 0" class="empty-state">
        <p>{{ t('noMatchingDatasets') }}</p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
        <div class="modal-content admin-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ t('deleteDatasetTitle') }}</h3>
            <button @click="closeDeleteModal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="warning-message">
              <span class="warning-icon">⚠️</span>
              <p>
                {{ t('deleteConfirmQuestion') }} 
                <strong>"{{ datasetToDelete?.filename }}"</strong>?
              </p>
            </div>
            <p class="warning-details">{{ t('deleteWillRemove') }}</p>
            <ul class="warning-list">
              <li><strong>{{ datasetToDelete?.event_count }} {{ t('eventsImported') }}</strong></li>
              <li>{{ t('datasetRecordItself') }}</li>
            </ul>
            <p class="warning-note">{{ t('tagsPreservedNote') }}</p>
          </div>
          
          <div class="modal-footer">
            <button @click="closeDeleteModal" class="modal-cancel-btn">{{ t('cancel') }}</button>
            <button 
              @click="deleteDataset" 
              class="modal-delete-btn"
              :disabled="localLoading"
            >
              {{ localLoading ? t('deleting') : t('deleteDataset') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
        <div class="modal-content admin-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ t('createEmptyDatasetTitle') }}</h3>
            <button @click="closeCreateModal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div v-if="createError" class="error-message">{{ createError }}</div>
            
            <form @submit.prevent="createEmptyDataset">
              <div class="form-group">
                <label for="dataset-filename">{{ t('datasetName') }} *</label>
                <input 
                  id="dataset-filename"
                  v-model="newDataset.filename"
                  type="text" 
                  :placeholder="t('datasetNamePlaceholder')" 
                  class="form-input"
                  :class="{ 'input-error': createError && !newDataset.filename }"
                >
              </div>
              
              <div class="form-group">
                <label for="dataset-description">{{ t('descriptionOptional') }}</label>
                <textarea 
                  id="dataset-description"
                  v-model="newDataset.description"
                  :placeholder="t('descriptionPlaceholder')"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button @click="closeCreateModal" class="modal-cancel-btn">{{ t('cancel') }}</button>
            <button 
              @click="createEmptyDataset" 
              class="modal-save-btn"
              :disabled="localLoading || !newDataset.filename.trim()"
            >
              {{ localLoading ? t('creating') : t('createDataset') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import apiService from '@/services/api.js'
import authService from '@/services/authService.js'
import { useEvents } from '@/composables/useEvents.js'
import { useLocale } from '@/composables/useLocale.js'
import { useTags } from '@/composables/useTags.js'
import TablePagination from '@/components/TablePagination.vue'

export default {
  name: 'DatasetsPanel',
  components: {
    TablePagination
  },
  setup() {
    const { t } = useLocale()
    const { refreshTags } = useTags()
    const datasets = ref([])
    const localLoading = ref(false)
    const localError = ref(null)
    const showDeleteModal = ref(false)
    const datasetToDelete = ref(null)
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const showCreateModal = ref(false)
    const createError = ref(null)
    const newDataset = ref({
      filename: '',
      description: ''
    })
    
    const searchQuery = ref('')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const sortField = ref('created_at')
    const sortDirection = ref('desc')
    
    const { fetchEvents } = useEvents()

    const filteredDatasets = computed(() => {
      let result = [...datasets.value]
      
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(d => 
          d.filename?.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query)
        )
      }
      
      result.sort((a, b) => {
        let aVal = a[sortField.value]
        let bVal = b[sortField.value]
        
        if (sortField.value === 'created_at') {
          aVal = new Date(aVal).getTime()
          bVal = new Date(bVal).getTime()
        }
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }
        
        if (sortDirection.value === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
      
      return result
    })

    const currentPageDatasets = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredDatasets.value.slice(start, end)
    })

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

    const fetchDatasets = async () => {
      localLoading.value = true
      localError.value = null
      
      try {
        const response = await apiService.getDatasets()
        datasets.value = Array.isArray(response) ? response.filter(d => d && d.id) : []
      } catch (err) {
        console.error('Error fetching datasets:', err)
        localError.value = err.message || t('failedToLoadDatasets')
      } finally {
        localLoading.value = false
      }
    }

    const confirmDelete = (dataset) => {
      datasetToDelete.value = dataset
      showDeleteModal.value = true
    }

    const closeDeleteModal = () => {
      showDeleteModal.value = false
      datasetToDelete.value = null
    }

    const exportDataset = async (dataset) => {
      localLoading.value = true
      localError.value = null
      
      try {
        const response = await apiService.exportDataset(dataset.id)
        
        const blob = new Blob([JSON.stringify(response, null, 2)], { 
          type: 'application/json' 
        })
        
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        const exportFilename = dataset.filename || `dataset_${dataset.id}_export.json`
        link.download = exportFilename
        
        document.body.appendChild(link)
        link.click()
        
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        
      } catch (err) {
        console.error('Error exporting dataset:', err)
        localError.value = err.message || t('failedToExport')
      } finally {
        localLoading.value = false
      }
    }

    const deleteDataset = async () => {
      if (!datasetToDelete.value) return
      
      localLoading.value = true
      localError.value = null
      
      try {
        await apiService.deleteDataset(datasetToDelete.value.id)
        
        datasets.value = datasets.value.filter(d => d.id !== datasetToDelete.value.id)
        
        await fetchEvents()
        
        closeDeleteModal()
        
      } catch (err) {
        console.error('Error deleting dataset:', err)
        localError.value = err.message || t('failedToDelete')
      } finally {
        localLoading.value = false
      }
    }

    const triggerFileSelect = () => {
      fileInput.value?.click()
    }

    const handleFileSelect = (event) => {
      const file = event.target.files?.[0]
      if (file && file.type === 'application/json') {
        selectedFile.value = file
        localError.value = null
      } else {
        localError.value = t('selectValidJson')
        selectedFile.value = null
      }
    }

    const clearSelection = () => {
      selectedFile.value = null
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    const importDataset = async () => {
      if (!selectedFile.value) return

      localLoading.value = true
      localError.value = null

      try {
        const fileContent = await selectedFile.value.text()
        const jsonData = JSON.parse(fileContent)

        if (!jsonData.events || !Array.isArray(jsonData.events)) {
          throw new Error(t('invalidFileFormat'))
        }

        await apiService.importEvents(
          jsonData.events, 
          jsonData.filename || selectedFile.value.name
        )

        await fetchDatasets()
        await fetchEvents()
        await refreshTags()

        clearSelection()

      } catch (err) {
        console.error('Error importing dataset:', err)
        if (err.message.includes('JSON')) {
          localError.value = t('invalidJsonFormat')
        } else {
          localError.value = err.message || t('failedToImport')
        }
      } finally {
        localLoading.value = false
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const resetModifiedFlag = async (dataset) => {
      localLoading.value = true
      localError.value = null
      
      try {
        await apiService.resetDatasetModified(dataset.id)
        
        const idx = datasets.value.findIndex(d => d.id === dataset.id)
        if (idx !== -1) {
          datasets.value[idx].modified = false
        }
        
      } catch (err) {
        console.error('Error resetting modified flag:', err)
        localError.value = err.message || t('failedToResetModified')
      } finally {
        localLoading.value = false
      }
    }

    const openCreateModal = () => {
      newDataset.value = {
        filename: '',
        description: ''
      }
      createError.value = null
      showCreateModal.value = true
    }

    const closeCreateModal = () => {
      showCreateModal.value = false
      createError.value = null
    }

    const createEmptyDataset = async () => {
      if (!newDataset.value.filename.trim()) {
        createError.value = t('datasetNameRequired')
        return
      }

      localLoading.value = true
      createError.value = null

      try {
        const currentUser = authService.getUser()
        if (!currentUser) {
          throw new Error(t('mustBeLoggedIn'))
        }

        const datasetData = {
          filename: newDataset.value.filename.trim(),
          description: newDataset.value.description.trim() || '',
          event_count: 0,
          uploaded_by: currentUser.id
        }

        await apiService.createDataset(datasetData)

        await fetchDatasets()
        
        closeCreateModal()

      } catch (err) {
        console.error('Error creating dataset:', err)
        createError.value = err.message || t('failedToCreate')
      } finally {
        localLoading.value = false
      }
    }

    onMounted(() => {
      fetchDatasets()
    })

    return {
      t,
      datasets,
      localLoading,
      localError,
      showDeleteModal,
      datasetToDelete,
      fileInput,
      selectedFile,
      fetchDatasets,
      triggerFileSelect,
      handleFileSelect,
      clearSelection,
      importDataset,
      exportDataset,
      confirmDelete,
      closeDeleteModal,
      deleteDataset,
      formatDate,
      showCreateModal,
      createError,
      newDataset,
      openCreateModal,
      closeCreateModal,
      createEmptyDataset,
      resetModifiedFlag,
      searchQuery,
      currentPage,
      pageSize,
      sortField,
      sortDirection,
      filteredDatasets,
      currentPageDatasets,
      toggleSort,
      handlePageChange,
      handlePageSizeChange
    }
  }
}
</script>

<style scoped>
.admin-panel {
  padding: 2rem;
  max-width: 100%;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.admin-title {
  flex: 1;
  min-width: 0;
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
  flex-wrap: nowrap;
  flex-shrink: 0;
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
  white-space: nowrap;
}

.create-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.create-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.create-btn.import-btn {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
}

.create-btn.import-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #047857 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.btn-icon {
  font-size: 1rem;
}

.import-preview {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.import-preview-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-icon {
  font-size: 1.5rem;
}

.file-name {
  font-weight: 600;
  color: #065f46;
}

.confirm-btn {
  background: #059669;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.confirm-btn:hover:not(:disabled) {
  background: #047857;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.table-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  padding: 2rem;
  text-align: center;
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
}

.retry-btn {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
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

.table-filters {
  display: flex;
  gap: 1rem;
  align-items: center;
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

.event-row.modified-row {
  background: #fffbeb;
}

.event-row.modified-row:hover {
  background: #fef3c7;
}

.filename-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modified-icon {
  font-size: 1rem;
}

.filename {
  font-weight: 600;
  color: #2d3748;
}

.description-text {
  color: #4a5568;
  line-height: 1.4;
}

.count-badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
}

.dataset-uploader {
  color: #4a5568;
}

.dataset-date {
  color: #6b7280;
  font-size: 0.875rem;
}

.actions-wrapper {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  background: #f3f4f6;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.reset-btn {
  background: #d1fae5;
  color: #059669;
}

.action-btn.reset-btn:hover:not(:disabled) {
  background: #a7f3d0;
}

.action-btn.export-btn {
  background: #e0e7ff;
  color: #4338ca;
}

.action-btn.export-btn:hover:not(:disabled) {
  background: #c7d2fe;
}

.action-btn.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn.delete-btn:hover:not(:disabled) {
  background: #fecaca;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.empty-state p {
  margin: 0;
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
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.warning-icon {
  font-size: 1.5rem;
}

.warning-message p {
  margin: 0;
  color: #374151;
}

.warning-details {
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.warning-list {
  margin: 0 0 1rem 1.5rem;
  color: #374151;
}

.warning-list li {
  margin-bottom: 0.25rem;
}

.warning-note {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-input.input-error {
  border-color: #dc2626;
}

.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  resize: vertical;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.modal-cancel-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-cancel-btn:hover {
  background: #f3f4f6;
}

.modal-save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
}

.modal-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-delete-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: #dc2626;
  color: white;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-delete-btn:hover:not(:disabled) {
  background: #b91c1c;
}

.modal-delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .admin-header {
    flex-wrap: wrap;
  }
  
  .action-buttons {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .create-btn {
    flex: 1;
    justify-content: center;
    min-width: 150px;
  }
}

@media (max-width: 768px) {
  .admin-panel {
    padding: 1rem;
  }
  
  .admin-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-buttons {
    flex-direction: column;
    width: 100%;
  }
  
  .create-btn {
    justify-content: center;
    width: 100%;
  }
  
  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
  
  .events-table {
    font-size: 0.8rem;
  }
  
  .events-table th,
  .events-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>
