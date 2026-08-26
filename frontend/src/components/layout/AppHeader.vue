<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Logo with dropdown menu -->
      <div class="logo-dropdown" @click.stop>
        <button class="logo-btn" @click="toggleLogoDropdown">
          <GlobeClockMark :size="34" :inverted="false" />
          <span class="logo-wordmark">timediverr</span>
          <span class="dropdown-arrow" :class="{ 'open': showLogoDropdown }">▼</span>
        </button>
        <div v-if="showLogoDropdown" class="logo-dropdown-menu">
          <!-- Map link - always visible -->
          <router-link 
            to="/" 
            class="dropdown-item"
            @click="showLogoDropdown = false"
          >
            <span class="dropdown-icon">🗺️</span>
            {{ t('map') }}
          </router-link>
          
          <!-- About link - always visible -->
          <router-link 
            to="/about" 
            class="dropdown-item"
            @click="showLogoDropdown = false"
          >
            <span class="dropdown-icon">ℹ️</span>
            {{ t('about') }}
          </router-link>
          
          <!-- Guest: Login button -->
          <button 
            v-if="isGuest"
            class="dropdown-item"
            @click="openLoginModal"
          >
            <span class="dropdown-icon">🔑</span>
            {{ t('login') }}
          </button>
          
          <!-- Authenticated: User info and Logout -->
          <template v-else>
            <div class="dropdown-user-info">
              <span class="dropdown-welcome">{{ t('welcome') }}, <strong>{{ user?.username }}</strong></span>
              <span v-if="user?.access_level === 'super'" class="access-badge super">{{ t('superBadge') }}</span>
              <span v-else-if="user?.access_level === 'admin'" class="access-badge admin">{{ t('adminBadge') }}</span>
              <span v-else-if="user?.access_level === 'editor'" class="access-badge editor">{{ t('editorBadge') }}</span>
            </div>
            
            <!-- Admin section - for users with admin access -->
            <template v-if="canAccessAdmin">
              <div class="dropdown-section-divider"></div>
              <router-link 
                to="/admin/events" 
                class="dropdown-item"
                @click="showLogoDropdown = false"
              >
                <span class="dropdown-icon">📅</span>
                {{ t('events') }}
              </router-link>
              <router-link 
                to="/admin/tags" 
                class="dropdown-item"
                @click="showLogoDropdown = false"
              >
                <span class="dropdown-icon">🏷️</span>
                {{ t('tags') }}
              </router-link>
              <router-link 
                to="/admin/templates" 
                class="dropdown-item"
                @click="showLogoDropdown = false"
              >
                <span class="dropdown-icon">📆</span>
                {{ t('templates') }}
              </router-link>
              <router-link 
                to="/admin/regions" 
                class="dropdown-item"
                @click="showLogoDropdown = false"
              >
                <span class="dropdown-icon">🗺️</span>
                {{ t('regions') }}
              </router-link>
              <router-link 
                to="/admin/datasets" 
                class="dropdown-item"
                @click="showLogoDropdown = false"
              >
                <span class="dropdown-icon">📦</span>
                {{ t('datasets') }}
              </router-link>
              <router-link 
                v-if="isSuper"
                to="/admin/users" 
                class="dropdown-item"
                @click="showLogoDropdown = false"
              >
                <span class="dropdown-icon">👥</span>
                {{ t('users') }}
              </router-link>
            </template>
            
            <div class="dropdown-section-divider"></div>
            <button 
              class="dropdown-item logout-item"
              @click="handleLogoutFromDropdown"
              :disabled="loading"
            >
              <span class="dropdown-icon">🚪</span>
              {{ t('logout') }}
            </button>
          </template>
        </div>
      </div>
      
      <div class="right-section">
        <!-- Locale Selector - positioned at far right -->
        <div class="locale-selector" @click.stop>
          <button 
            class="locale-btn" 
            @click="toggleLocaleDropdown"
            :title="`Switch language - Current: ${currentLocale?.name || 'English'}`"
          >
            <span class="locale-flag">{{ currentLocale?.flag || '🇺🇸' }}</span>
            <span class="locale-code">{{ currentLocale?.code?.toUpperCase() || 'EN' }}</span>
            <span class="dropdown-arrow" :class="{ 'open': showLocaleDropdown }">▼</span>
          </button>
          <div v-if="showLocaleDropdown" class="locale-dropdown">
            <button 
              v-for="localeOption in supportedLocales" 
              :key="localeOption.code"
              class="locale-option"
              :class="{ 'active': localeOption.code === locale }"
              @click="handleLocaleChange(localeOption.code)"
            >
              <span class="locale-flag">{{ localeOption.flag }}</span>
              <span class="locale-name">{{ localeOption.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Login Modal - Using Teleport to render outside component hierarchy -->
    <Teleport to="body">
      <div v-if="showLoginModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>{{ t('loginToHistoria') }}</h2>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div v-if="error" class="error-message">
              {{ error }}
            </div>
            
            <form @submit.prevent="handleLogin">
              <div class="form-group">
                <label for="username">{{ t('username') }}</label>
                <input 
                  id="username"
                  v-model="loginForm.username" 
                  type="text" 
                  required 
                  class="form-input"
                  :placeholder="t('enterUsername')"
                />
              </div>
              
              <div class="form-group">
                <label for="password">{{ t('password') }}</label>
                <input 
                  id="password"
                  v-model="loginForm.password" 
                  type="password" 
                  required 
                  class="form-input"
                  :placeholder="t('enterPassword')"
                />
              </div>
              
              <div class="form-actions">
                <button type="submit" class="submit-btn" :disabled="loading">
                  {{ loading ? t('loggingIn') : t('login') }}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth.js'
import { useLocale } from '@/composables/useLocale.js'
import GlobeClockMark from '@/components/layout/GlobeClockMark.vue'

export default {
  name: 'AppHeader',
  components: { GlobeClockMark },
  setup() {
    const { user, isAuthenticated, isGuest, canAccessAdmin, isSuper, loading, error, login, logout, clearError } = useAuth()
    const { locale, currentLocale, supportedLocales, setLocale, t } = useLocale()
    
    const showLoginModal = ref(false)
    const showLocaleDropdown = ref(false)
    const showLogoDropdown = ref(false)
    const loginForm = ref({
      username: '',
      password: ''
    })

    const handleLogin = async () => {
      try {
        clearError()
        await login(loginForm.value.username, loginForm.value.password)
        showLoginModal.value = false
        loginForm.value = { username: '', password: '' }
      } catch (err) {
        // Error is handled by useAuth composable
        console.error('Login failed:', err)
      }
    }

    const handleLogout = async () => {
      try {
        await logout()
      } catch (err) {
        console.error('Logout failed:', err)
      }
    }

    const closeModal = () => {
      showLoginModal.value = false
      clearError()
      loginForm.value = { username: '', password: '' }
    }

    const toggleLocaleDropdown = () => {
      showLocaleDropdown.value = !showLocaleDropdown.value
      showLogoDropdown.value = false
    }

    const toggleLogoDropdown = () => {
      showLogoDropdown.value = !showLogoDropdown.value
      showLocaleDropdown.value = false
    }

    const openLoginModal = () => {
      showLogoDropdown.value = false
      showLoginModal.value = true
    }

    const handleLogoutFromDropdown = async () => {
      showLogoDropdown.value = false
      await handleLogout()
    }

    const handleLocaleChange = (newLocale) => {
      setLocale(newLocale)
      showLocaleDropdown.value = false
      // Emit event to trigger data refresh in components
      window.dispatchEvent(new CustomEvent('localeChanged', { detail: newLocale }))
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.locale-selector')) {
        showLocaleDropdown.value = false
      }
      if (!event.target.closest('.logo-dropdown')) {
        showLogoDropdown.value = false
      }
    }

    // Add event listener on mount
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })
    
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      user,
      isAuthenticated,
      isGuest,
      canAccessAdmin,
      isSuper,
      loading,
      error,
      showLoginModal,
      showLocaleDropdown,
      showLogoDropdown,
      loginForm,
      locale,
      currentLocale,
      supportedLocales,
      t,
      handleLogin,
      handleLogout,
      closeModal,
      toggleLocaleDropdown,
      toggleLogoDropdown,
      openLoginModal,
      handleLogoutFromDropdown,
      handleLocaleChange
    }
  }
}
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  color: white;
  padding: 0.75rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 50000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

/* Logo Dropdown Styles */
.logo-dropdown {
  position: relative;
  display: inline-block;
  z-index: 100000;
}

.logo-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.logo-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.logo-btn h1 {
  margin: 0;
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
}

.logo-wordmark {
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.03em;
  line-height: 1;
}

.logo-btn .dropdown-arrow {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.7rem;
}

.logo-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  margin-top: 0.5rem;
  overflow: hidden;
  z-index: 100001;
  min-width: 200px;
}

.logo-dropdown-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  text-decoration: none;
  color: #4a5568;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  border: none;
  background: white;
  width: 100%;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.logo-dropdown-menu .dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.logo-dropdown-menu .dropdown-icon {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.logo-dropdown-menu .dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0;
}

.logo-dropdown-menu .dropdown-section-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.25rem 0;
}

.logo-dropdown-menu .dropdown-user-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.logo-dropdown-menu .dropdown-welcome {
  font-size: 0.85rem;
  color: #4a5568;
  width: 100%;
}

.logo-dropdown-menu .logout-item {
  color: #e53e3e !important;
}

.logo-dropdown-menu .logout-item:hover {
  background: #fed7d7 !important;
}

.app-header h1 {
  margin: 0;
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auth-section {
  display: flex;
  align-items: center;
}

.auth-buttons {
  display: flex;
  gap: 0.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-welcome {
  font-size: 0.9rem;
}

.access-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-weight: bold;
}

.access-badge.super {
  background: #e53e3e;
  color: white;
}

.access-badge.admin {
  background: #4338ca;
  color: white;
}

.access-badge.editor {
  background: #38a169;
  color: white;
}

.auth-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  height: 40px;
  box-sizing: border-box;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.login-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.logout-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.logout-btn:hover {
  background: rgba(231, 76, 60, 0.3);
  transform: translateY(-1px);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.auth-icon {
  font-size: 1rem;
}

/* Navigation styles */
.main-nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  height: 40px;
  box-sizing: border-box;
  border-radius: 6px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

.nav-link:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-link-active {
  color: white;
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.nav-icon {
  font-size: 1rem;
}

/* Locale Selector Styles - positioned at far right */
.locale-selector {
  position: relative;
  display: inline-block;
  z-index: 100000;
  margin-left: auto; /* Push to far right */
}

.locale-btn {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  height: 40px;
  box-sizing: border-box;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 80px;
}

.locale-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: translateY(-1px);
}

.locale-flag {
  font-size: 1rem;
}

.locale-code {
  font-weight: 600;
  font-size: 0.8rem;
}

.locale-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  margin-top: 0.5rem;
  overflow: hidden;
  z-index: 100000;
  min-width: 140px;
}

.locale-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  text-decoration: none;
  color: #4a5568;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.locale-option:hover {
  background: #f7fafc;
  color: #2d3748;
}

.locale-option.active {
  background: #edf2f7;
  color: #2d3748;
  font-weight: 600;
}

.locale-name {
  font-size: 0.9rem;
}

/* Admin Dropdown Styles */
.admin-dropdown {
  position: relative;
  display: inline-block;
  z-index: 100000;
  flex-shrink: 0;
}

.dropdown-trigger {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  min-width: 120px;
  height: 40px;
  box-sizing: border-box;
  padding: 0.625rem 1rem;
}

.dropdown-arrow {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  transition: transform 0.2s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  margin-top: 0.5rem;
  overflow: hidden;
  z-index: 100000;
  min-width: 160px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  text-decoration: none;
  color: #4a5568;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border: none;
}

.dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.dropdown-icon {
  font-size: 1rem;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.5rem 0;
}

/* User Dropdown Styles */
.user-dropdown {
  position: relative;
  display: inline-block;
  z-index: 100000;
}

.user-menu-btn {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  height: 40px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  min-width: 100px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.user-menu-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.user-menu-btn .dropdown-arrow {
  font-size: 0.6rem;
  margin-left: auto;
  transition: transform 0.2s ease;
}

.user-menu-btn .dropdown-arrow.open {
  transform: rotate(180deg);
}

.username-text {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100001;
  min-width: 180px;
}

.user-dropdown-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: #4a5568;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border: none;
  background: white;
  width: 100%;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.user-dropdown-menu .dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.user-dropdown-menu .dropdown-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.user-dropdown-menu .dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0;
}

.dropdown-user-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dropdown-welcome {
  font-size: 0.85rem;
  color: #4a5568;
  width: 100%;
}

.user-dropdown-menu .logout-item {
  color: #e53e3e !important;
}

.user-dropdown-menu .logout-item:hover {
  background: #fed7d7 !important;
}

/* Global modal styles - not scoped since we use Teleport */
:global(.modal-overlay) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  padding: 20px;
  box-sizing: border-box;
}

:global(.modal-content) {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  margin: 20px;
  position: relative;
}

:global(.modal-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

:global(.modal-header h2) {
  margin: 0;
  color: #2d3748;
  font-size: 1.2rem;
}

:global(.close-btn) {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #718096;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(.close-btn:hover) {
  color: #2d3748;
}

:global(.modal-body) {
  padding: 1.5rem;
}

:global(.error-message) {
  background: #fed7d7;
  color: #c53030;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

:global(.form-group) {
  margin-bottom: 1rem;
}

:global(.form-group label) {
  display: block;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-weight: 500;
}

:global(.form-input) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

:global(.form-input:focus) {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

:global(.form-actions) {
  margin-top: 1.5rem;
}

:global(.submit-btn) {
  width: 100%;
  padding: 0.75rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

:global(.submit-btn:hover:not(:disabled)) {
  background: #4338ca;
}

:global(.submit-btn:disabled) {
  background: #a0aec0;
  cursor: not-allowed;
}

:global(.demo-info) {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 6px;
  border-left: 4px solid #4f46e5;
}

:global(.demo-info p) {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: #4a5568;
}

:global(.demo-info code) {
  background: #e2e8f0;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #2d3748;
}

@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem 1rem;
  }
  
  .header-content {
    flex-direction: row;
    gap: 0.75rem;
  }
  
  .app-header h1,
  .logo-btn h1 {
    font-size: 1.1rem;
  }

  .logo-btn {
    padding: 0.25rem 0.5rem;
    gap: 0.4rem;
  }

  .locale-btn {
    padding: 0.4rem 0.6rem;
    height: 36px;
    min-width: 70px;
  }
  
  .user-welcome {
    display: none;
  }
  
  .user-info {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-header,
  .modal-body {
    padding: 1rem;
  }
}
</style>