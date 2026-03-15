import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/device' },

  // Child app (device)
  {
    path: '/device',
    name: 'child-dashboard',
    component: () => import('../views/child/ChildDashboardView.vue'),
    meta: { app: 'child', requiresAuth: true, title: 'ダッシュボード' },
  },
  {
    path: '/device/timeline',
    name: 'child-timeline',
    component: () => import('../views/child/ChildTimelineView.vue'),
    meta: { app: 'child', requiresAuth: true, title: 'タイムライン' },
  },
  {
    path: '/device/tags',
    name: 'child-tags',
    component: () => import('../views/child/ChildTagsView.vue'),
    meta: { app: 'child', requiresAuth: true, title: 'タグ設定' },
  },
  {
    path: '/device/changelog',
    name: 'child-changelog',
    component: () => import('../views/child/ChangelogView.vue'),
    meta: { app: 'child', requiresAuth: false, title: '更新履歴' },
  },
  {
    path: '/device/new-user',
    name: 'new-user',
    component: () => import('../views/child/NewUserView.vue'),
    meta: { app: 'child', requiresAuth: false, title: '新規登録' },
  },

  // Manage app (parent)
  {
    path: '/manage',
    name: 'manage-dashboard',
    component: () => import('../views/manage/ManageDashboardView.vue'),
    meta: { app: 'manage', requiresAuth: false, title: 'ダッシュボード' },
  },
  {
    path: '/manage/tags',
    name: 'manage-tags',
    component: () => import('../views/manage/ManageCommonTagsView.vue'),
    meta: { app: 'manage', requiresAuth: false, title: '共通タグ' },
  },
  {
    path: '/manage/gps-tags',
    name: 'manage-gps-tags',
    component: () => import('../views/manage/ManageGpsTagsView.vue'),
    meta: { app: 'manage', requiresAuth: false, title: 'GPSタグ' },
  },
  {
    path: '/manage/changelog',
    name: 'manage-changelog',
    component: () => import('../views/child/ChangelogView.vue'),
    meta: { app: 'manage', requiresAuth: false, title: '更新履歴' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
