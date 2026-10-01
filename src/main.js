import { createApp } from 'vue'
import vuetify from './plugins/vuetify'
import router from './router'
import App from './App.vue'

// LINE のアプリ内ブラウザではカメラを使えないため、外部ブラウザで開き直す
// openExternalBrowser=1 は LINE が外部ブラウザで開くためのパラメータ
const EXTERNAL_PARAM = 'openExternalBrowser'
const url = new URL(location.href)
const isLineBrowser = /\bLine\/\d/.test(navigator.userAgent)

if (isLineBrowser && !url.searchParams.has(EXTERNAL_PARAM)) {
  url.searchParams.set(EXTERNAL_PARAM, '1')
  location.replace(url.toString())
} else {
  // 外部ブラウザで開いた後は URL にパラメータを残さない
  // （LINE が外部ブラウザを開けなかった場合は、そのまま LINE 内で表示する）
  if (!isLineBrowser && url.searchParams.has(EXTERNAL_PARAM)) {
    url.searchParams.delete(EXTERNAL_PARAM)
    history.replaceState(history.state, '', url.toString())
  }

  const app = createApp(App)
  app.use(vuetify)
  app.use(router)
  app.mount('#app')
}
