import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/device' },

  // Child app (device)
  {
    path: '/device',
    name: 'child-dashboard',
    component: () => import('../views/child/ChildDashboardView.vue'),
    meta: { app: 'child', requiresAuth: true },
  },
  {
    path: '/device/timeline',
    name: 'child-timeline',
    component: () => import('../views/child/ChildTimelineView.vue'),
    meta: { app: 'child', requiresAuth: true },
  },
  {
    path: '/device/tags',
    name: 'child-tags',
    component: () => import('../views/child/ChildTagsView.vue'),
    meta: { app: 'child', requiresAuth: true },
  },
  {
    path: '/device/new-user',
    name: 'new-user',
    component: () => import('../views/child/NewUserView.vue'),
    meta: { app: 'child', requiresAuth: false },
  },

  // Manage app (parent)
  {
    path: '/manage',
    name: 'manage-dashboard',
    component: () => import('../views/manage/ManageDashboardView.vue'),
    meta: { app: 'manage', requiresAuth: false },
  },
  {
    path: '/manage/tags',
    name: 'manage-tags',
    component: () => import('../views/manage/ManageCommonTagsView.vue'),
    meta: { app: 'manage', requiresAuth: false },
  },
  {
    path: '/manage/gps-tags',
    name: 'manage-gps-tags',
    component: () => import('../views/manage/ManageGpsTagsView.vue'),
    meta: { app: 'manage', requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
