<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editTag: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const name = ref('')
const latitude = ref('')
const longitude = ref('')

watch(() => props.modelValue, (v) => {
  if (v && props.editTag) {
    name.value = props.editTag.name
    latitude.value = String(props.editTag.latitude)
    longitude.value = String(props.editTag.longitude)
  } else if (v) {
    name.value = ''
    latitude.value = ''
    longitude.value = ''
  }
})

function handleSubmit() {
  if (!name.value.trim() || !latitude.value || !longitude.value) return
  emit('submit', {
    name: name.value.trim(),
    latitude: parseFloat(latitude.value),
    longitude: parseFloat(longitude.value),
  })
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-body-1 font-weight-bold">
        {{ editTag ? 'GPSタグを編集' : 'GPSタグを追加' }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="name"
          label="場所の名前"
          density="compact"
          hide-details
          class="mb-3"
        />
        <div class="d-flex ga-2">
          <v-text-field
            v-model="latitude"
            label="北緯"
            placeholder="35.681236"
            type="number"
            step="0.000001"
            density="compact"
            hide-details
          />
          <v-text-field
            v-model="longitude"
            label="東経"
            placeholder="139.767125"
            type="number"
            step="0.000001"
            density="compact"
            hide-details
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">キャンセル</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSubmit">
          {{ editTag ? '更新' : '追加' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
