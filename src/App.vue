<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import AppHeader from './components/AppHeader.vue'
import LoginDialog from './components/LoginDialog.vue'

const router = useRouter()
const { currentUser, restoreSession } = useAuth()
const showLogin = ref(false)
const loading = ref(true)

onMounted(async () => {
  const restored = await restoreSession()
  loading.value = false
  if (!restored && router.currentRoute.value.name !== 'new-user') {
    showLogin.value = true
  }
})

router.beforeEach((to) => {
  if (to.name === 'new-user') return true
  if (!currentUser.value && !loading.value) {
    showLogin.value = true
    return false
  }
  return true
})

function onLoggedIn() {
  showLogin.value = false
}

function onGoRegister() {
  showLogin.value = false
  router.push('/new-user')
}
</script>

<template>
  <v-app>
    <AppHeader v-if="currentUser" />
    <v-main>
      <v-container v-if="loading" class="d-flex justify-center align-center" style="min-height: 60vh">
        <v-progress-circular indeterminate color="primary" size="48" />
      </v-container>
      <router-view v-else />
    </v-main>
    <LoginDialog
      v-model="showLogin"
      @logged-in="onLoggedIn"
      @go-register="onGoRegister"
    />
  </v-app>
</template>
