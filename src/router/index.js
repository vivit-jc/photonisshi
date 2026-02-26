import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import NewUserView from '../views/NewUserView.vue'
import ImageListView from '../views/ImageListView.vue'
import TagSettingsView from '../views/TagSettingsView.vue'

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/new-user', name: 'new-user', component: NewUserView },
  { path: '/images', name: 'images', component: ImageListView },
  { path: '/tags', name: 'tags', component: TagSettingsView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
