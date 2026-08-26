<template>
  <div id="app">
    <!-- Header -->
    <AppHeader />
    
    <!-- Router View - Different pages rendered here -->
    <router-view />
  </div>
</template>

<script>
import { onMounted } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useEvents } from '@/composables/useEvents.js'
import { useTemplates } from '@/composables/useTemplates.js'
import { useTags } from '@/composables/useTags.js'
import { useAuth } from '@/composables/useAuth.js'

export default {
  name: 'App',
  components: {
    AppHeader
  },
  setup() {
    // Composables for global data loading
    const { fetchEvents } = useEvents()
    const { fetchTemplateGroups } = useTemplates()
    const { loadTags } = useTags()
    const { initAuth } = useAuth()

    // Initialize data on mount
    onMounted(async () => {
      // Initialize authentication first (heartbeat auto-starts in useAuth)
      await initAuth()
      
      await Promise.all([
        fetchEvents(),
        fetchTemplateGroups(),
        loadTags()
      ])
      
      console.log('App.vue: Data loading completed')
    })

    return {}
  }
}
</script>

<style>
/* Global app styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f7fafc;
  color: #2d3748;
  line-height: 1.6;
}

button, input, select, textarea {
  font-family: inherit;
}

button {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Router view takes full available space */
</style>