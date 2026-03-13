<script setup>
defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <v-select
    :model-value="modelValue"
    :items="options"
    density="compact"
    hide-details
    label="タグで絞り込み"
    multiple
    chips
    closable-chips
    clearable
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
