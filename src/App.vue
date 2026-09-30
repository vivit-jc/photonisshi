<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { useManageAuth } from './composables/useManageAuth'
import LoginDialog from './components/LoginDialog.vue'

const ChildAppHeader = defineAsyncComponent(() => import('./components/child/ChildAppHeader.vue'))
const ManageAppHeader = defineAsyncComponent(() => import('./components/manage/ManageAppHeader.vue'))
const ManageLoginDialog = defineAsyncComponent(() => import('./components/manage/ManageLoginDialog.vue'))

const route = useRoute()
const router = useRouter()
const { currentUser, restoreSession } = useAuth()
const { isManageAuthenticated } = useManageAuth()
const showLogin = ref(false)
const loading = ref(true)

const isManageApp = computed(() => route.meta.app === 'manage')
const isChildApp = computed(() => route.meta.app === 'child')
const needsManageLogin = computed(() => !!route.meta.requiresManageAuth && !isManageAuthenticated.value)

onMounted(async () => {
  const restored = await restoreSession()
  loading.value = false
  if (!restored && route.meta.requiresAuth) {
    showLogin.value = true
  }
})

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
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
  router.push('/device/new-user')
}
</script>

<template>
  <v-app>
    <ChildAppHeader v-if="isChildApp && currentUser" />
    <ManageAppHeader v-if="isManageApp && !needsManageLogin" />
    <v-main>
      <v-container v-if="loading" class="d-flex justify-center align-center" style="min-height: 60vh">
        <v-progress-circular indeterminate color="primary" size="48" />
      </v-container>
      <router-view v-else-if="!needsManageLogin" />
    </v-main>
    <LoginDialog
      v-model="showLogin"
      @logged-in="onLoggedIn"
      @go-register="onGoRegister"
    />
    <ManageLoginDialog v-if="isManageApp" :model-value="needsManageLogin" />
  </v-app>
</template>
