<script setup>
import { ref, computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useRouter, useRoute } from 'vue-router'

const { currentUser, clearUser } = useAuth()
const router = useRouter()
const route = useRoute()
const pageTitle = computed(() => route.meta?.title || 'photonisshi')
const drawer = ref(false)

const navItems = [
  { title: 'ダッシュボード', icon: 'mdi-view-dashboard', to: '/device' },
  { title: 'タイムライン', icon: 'mdi-image-multiple', to: '/device/timeline' },
  { title: 'タグ設定', icon: 'mdi-tag-multiple', to: '/device/tags' },
]

function logout() {
  clearUser()
  drawer.value = false
  router.go(0)
}
</script>

<template>
  <v-app-bar color="primary" density="compact">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title class="text-body-1 font-weight-bold">
      {{ pageTitle }}
    </v-app-bar-title>
    <template #append>
      <v-chip size="small" variant="tonal" class="mr-2">
        <v-icon start size="small">mdi-account</v-icon>
        {{ currentUser?.username }}
      </v-chip>
    </template>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" temporary>
    <v-list nav density="compact">
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        @click="drawer = false"
      />
      <v-divider class="my-2" />
      <v-list-item
        prepend-icon="mdi-logout"
        title="ログアウト"
        @click="logout"
      />
    </v-list>
  </v-navigation-drawer>
</template>
