<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useManageAuth } from '../../composables/useManageAuth'

const route = useRoute()
const { manageUser, manageLogout } = useManageAuth()
const drawer = ref(false)
const pageTitle = computed(() => route.meta?.title || '管理')

const navItems = [
  { title: 'ダッシュボード', icon: 'mdi-view-dashboard', to: '/manage' },
  { title: '共通タグ', icon: 'mdi-tag-multiple', to: '/manage/tags' },
  { title: 'GPSタグ', icon: 'mdi-map-marker', to: '/manage/gps-tags' },
  { title: '店舗タイムライン', icon: 'mdi-store', to: '/manage/store-timeline' },
  { title: '売上入力', icon: 'mdi-currency-jpy', to: '/manage/sales' },
  { title: '更新履歴', icon: 'mdi-history', to: '/manage/changelog' },
]
</script>

<template>
  <v-app-bar color="teal-darken-2" density="compact">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title class="text-body-1 font-weight-bold">
      管理 - {{ pageTitle }}
    </v-app-bar-title>
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
    </v-list>
    <template #append>
      <v-list nav density="compact">
        <v-list-item
          prepend-icon="mdi-logout"
          title="ログアウト"
          :subtitle="manageUser?.username"
          @click="drawer = false; manageLogout()"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
