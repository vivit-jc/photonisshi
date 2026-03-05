<script setup>
import { ref } from 'vue'

const drawer = ref(false)

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
      photonisshi 管理
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
