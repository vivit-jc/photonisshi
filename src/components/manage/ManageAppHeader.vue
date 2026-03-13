<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const drawer = ref(false)
const pageTitle = computed(() => route.meta?.title || '管理')

const navItems = [
  { title: 'ダッシュボード', icon: 'mdi-view-dashboard', to: '/manage' },
  { title: '共通タグ', icon: 'mdi-tag-multiple', to: '/manage/tags' },
  { title: 'GPSタグ', icon: 'mdi-map-marker', to: '/manage/gps-tags' },
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
  </v-navigation-drawer>
</template>
