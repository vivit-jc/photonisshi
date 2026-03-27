<script setup>
import { ref, computed } from 'vue'
import { STORE_NAMES } from '../../constants/stores'
import { useSales } from '../../composables/useSales'
import { getTodayJST, getDaysAgoJST } from '../../utils/date'

const { hasExistingData, saveSales, getSalesRange } = useSales()

const selectedStore = ref('')
const dateFrom = ref(getDaysAgoJST(6))
const dateTo = ref(getTodayJST())
const inputText = ref('')
const errorMsg = ref('')
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')
const showConfirm = ref(false)

const expectedDays = computed(() => {
  if (!dateFrom.value || !dateTo.value) return 0
  const from = new Date(dateFrom.value + 'T00:00:00')
  const to = new Date(dateTo.value + 'T00:00:00')
  if (from > to) return 0
  return Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1
})

const dateLabels = computed(() => {
  if (!dateFrom.value || !dateTo.value || expectedDays.value === 0) return []
  const labels = []
  const days = ['日','月','火','水','木','金','土']
  const current = new Date(dateFrom.value + 'T00:00:00')
  for (let i = 0; i < expectedDays.value; i++) {
    const m = current.getMonth() + 1
    const d = current.getDate()
    const dow = days[current.getDay()]
    labels.push(`${m}/${d}(${dow})`)
    current.setDate(current.getDate() + 1)
  }
  return labels
})

const placeholder = computed(() => {
  if (expectedDays.value === 0) return ''
  return dateLabels.value.map(label => `${label} の売上`).join('\n')
})

function parseAmounts() {
  const lines = inputText.value.trim().split('\n').map(l => l.trim()).filter(l => l !== '')
  if (lines.length !== expectedDays.value) {
    return { error: `${expectedDays.value}日分の入力が必要ですが、${lines.length}行入力されています` }
  }
  const amounts = []
  for (let i = 0; i < lines.length; i++) {
    const num = Number(lines[i])
    if (isNaN(num) || lines[i] === '') {
      return { error: `${i + 1}行目「${lines[i]}」が数値ではありません` }
    }
    amounts.push(num)
  }
  return { amounts }
}

function handleSave() {
  errorMsg.value = ''
  if (!selectedStore.value) {
    errorMsg.value = '店舗を選択してください'
    return
  }
  if (expectedDays.value === 0) {
    errorMsg.value = '有効な日付範囲を指定してください'
    return
  }
  const result = parseAmounts()
  if (result.error) {
    errorMsg.value = result.error
    return
  }
  // 既存データチェック
  if (hasExistingData(selectedStore.value, dateFrom.value, dateTo.value)) {
    showConfirm.value = true
    return
  }
  doSave(result.amounts)
}

function handleConfirmOverwrite() {
  showConfirm.value = false
  const result = parseAmounts()
  if (result.error) {
    errorMsg.value = result.error
    return
  }
  doSave(result.amounts)
}

function doSave(amounts) {
  saveSales(selectedStore.value, dateFrom.value, amounts)
  snackbarMsg.value = `${selectedStore.value}の売上を保存しました`
  snackbarColor.value = 'success'
  snackbar.value = true
  errorMsg.value = ''
}

function loadExisting() {
  if (!selectedStore.value || expectedDays.value === 0) return
  const range = getSalesRange(selectedStore.value, dateFrom.value, dateTo.value)
  const lines = Object.values(range).map(v => v !== null ? String(v) : '')
  inputText.value = lines.join('\n')
}
</script>

<template>
  <div class="sales-bg">
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-3">売上入力</h2>

    <!-- 店舗選択 -->
    <v-select
      v-model="selectedStore"
      :items="STORE_NAMES"
      label="店舗を選択"
      density="compact"
      hide-details
      class="mb-3"
    />

    <!-- 日付範囲 -->
    <div class="d-flex ga-2 mb-3">
      <v-text-field
        v-model="dateFrom"
        type="date"
        label="開始日"
        density="compact"
        hide-details
      />
      <v-text-field
        v-model="dateTo"
        type="date"
        label="終了日"
        density="compact"
        hide-details
      />
    </div>

    <div v-if="expectedDays > 0" class="text-body-2 text-grey-darken-1 mb-1">
      {{ expectedDays }}日間（{{ dateLabels[0] }} 〜 {{ dateLabels[dateLabels.length - 1] }}）
    </div>

    <!-- 入力エリア -->
    <div class="d-flex ga-2 mb-1">
      <v-textarea
        v-model="inputText"
        :placeholder="placeholder"
        label="日別売上（1行1日・数値のみ）"
        density="compact"
        hide-details
        :rows="Math.max(expectedDays, 3)"
        class="flex-grow-1"
        style="font-variant-numeric: tabular-nums;"
      />
      <div v-if="expectedDays > 0" class="date-labels text-caption text-grey-darken-1">
        <div v-for="label in dateLabels" :key="label" class="date-label-row">
          {{ label }}
        </div>
      </div>
    </div>

    <v-alert v-if="errorMsg" type="error" density="compact" class="mb-3" variant="tonal">
      {{ errorMsg }}
    </v-alert>

    <!-- ボタン -->
    <div class="d-flex ga-2 mb-4">
      <v-btn
        color="teal"
        variant="flat"
        :disabled="!selectedStore || expectedDays === 0"
        @click="handleSave"
      >
        保存
      </v-btn>
      <v-btn
        variant="outlined"
        :disabled="!selectedStore || expectedDays === 0"
        @click="loadExisting"
      >
        既存データを読込
      </v-btn>
    </div>

    <!-- 上書き確認ダイアログ -->
    <v-dialog v-model="showConfirm" max-width="360">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold">上書き確認</v-card-title>
        <v-card-text>
          この期間には既に売上データが存在します。上書きしますか？
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showConfirm = false">キャンセル</v-btn>
          <v-btn color="warning" variant="flat" @click="handleConfirmOverwrite">上書き</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
  </div>
</template>

<style scoped>
.sales-bg {
  background-color: #fffff0;
  min-height: 100vh;
}
.sales-bg :deep(.v-field),
.sales-bg :deep(.v-card) {
  background-color: #fff;
}
.date-labels {
  display: flex;
  flex-direction: column;
  padding-top: 28px;
}
.date-label-row {
  height: 1.5rem;
  line-height: 1.5rem;
  white-space: nowrap;
}
</style>
