<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
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
const {
  manageUser, isManageAuthenticated, isAdminAuthenticated,
  loadSavedManageUsername, manageLogin, adminLogin, adminLogout,
} = useManageAuth()
const showLogin = ref(false)
const loading = ref(true)

const isManageApp = computed(() => route.meta.app === 'manage')
const isChildApp = computed(() => route.meta.app === 'child')
// ログイン前に画面をマウントすると currentUser が null のままデータ取得されないため、ログインまで描画しない
const needsLogin = computed(() => !!route.meta.requiresAuth && !currentUser.value)
const needsManageLogin = computed(() => !!route.meta.requiresManageAuth && !isManageAuthenticated.value)
const needsAdminLogin = computed(() =>
  !needsManageLogin.value && !!route.meta.requiresAdminAuth && !isAdminAuthenticated.value,
)

// ユーザー管理画面を離れたら admin ログインを解除する
watch(() => route.meta.requiresAdminAuth, (now, before) => {
  if (before && !now) adminLogout()
})

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
      <router-view v-else-if="!needsLogin && !needsManageLogin && !needsAdminLogin" />
    </v-main>
    <LoginDialog
      v-model="showLogin"
      @logged-in="onLoggedIn"
      @go-register="onGoRegister"
    />
    <ManageLoginDialog
      v-if="isManageApp"
      :model-value="needsManageLogin"
      :initial-username="loadSavedManageUsername()"
      :login="manageLogin"
    />
    <ManageLoginDialog
      v-if="isManageApp"
      :model-value="needsAdminLogin"
      title="ユーザー管理にログイン"
      description="ユーザー管理画面は admin 権限のあるユーザーのみ利用できます"
      :initial-username="manageUser?.username ?? ''"
      failed-message="ユーザー名またはパスワードが違うか、admin 権限がありません"
      :login="adminLogin"
      cancelable
      @cancel="router.push('/manage')"
    />
  </v-app>
</template>
