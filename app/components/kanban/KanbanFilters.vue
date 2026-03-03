<script setup lang="ts">
interface KanbanFiltersValue {
  dateFrom: string
  dateTo: string
  columnId: string
  search: string
}

interface ColumnOption {
  id: string
  name: string
}

const props = defineProps<{
  modelValue: KanbanFiltersValue
  columns: ColumnOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: KanbanFiltersValue]
}>()

const internalValue = reactive<KanbanFiltersValue>({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  Object.assign(internalValue, val)
}, { deep: true })

function update(key: keyof KanbanFiltersValue, value: string) {
  internalValue[key] = value
  emit('update:modelValue', { ...internalValue })
}

const columnOptions = computed(() => [
  { label: 'Todas as raias', value: 'all' },
  ...props.columns.map(c => ({ label: c.name, value: c.id }))
])

function clearFilters() {
  const cleared: KanbanFiltersValue = {
    dateFrom: '',
    dateTo: '',
    columnId: '',
    search: ''
  }
  Object.assign(internalValue, cleared)
  emit('update:modelValue', { ...cleared })
}

const hasActiveFilters = computed(() =>
  internalValue.search ||
  internalValue.dateFrom ||
  internalValue.dateTo ||
  internalValue.columnId
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border)">
    <!-- Search -->
    <UInput
      :model-value="internalValue.search"
      placeholder="Buscar cliente, telefone..."
      size="sm"
      class="w-52"
      @update:model-value="update('search', String($event))"
    >
      <template #leading>
        <UIcon name="i-lucide-search" class="text-(--ui-text-dimmed)" />
      </template>
    </UInput>

    <!-- Date from -->
    <div class="flex items-center gap-1.5">
      <UIcon name="i-lucide-calendar" class="text-sm text-(--ui-text-dimmed) shrink-0" />
      <input
        :value="internalValue.dateFrom"
        type="date"
        class="text-sm bg-(--ui-bg) border border-(--ui-border) rounded-md px-2 py-1.5 text-(--ui-text) focus:outline-none focus:ring-2 focus:ring-(--ui-primary) focus:border-transparent"
        :max="internalValue.dateTo || undefined"
        aria-label="Data inicial"
        @input="update('dateFrom', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <!-- Date separator -->
    <span class="text-xs text-(--ui-text-dimmed)">até</span>

    <!-- Date to -->
    <input
      :value="internalValue.dateTo"
      type="date"
      class="text-sm bg-(--ui-bg) border border-(--ui-border) rounded-md px-2 py-1.5 text-(--ui-text) focus:outline-none focus:ring-2 focus:ring-(--ui-primary) focus:border-transparent"
      :min="internalValue.dateFrom || undefined"
      aria-label="Data final"
      @input="update('dateTo', ($event.target as HTMLInputElement).value)"
    >

    <!-- Column filter -->
    <USelect
      :model-value="internalValue.columnId || 'all'"
      :items="columnOptions"
      value-key="value"
      label-key="label"
      size="sm"
      class="w-44"
      @update:model-value="update('columnId', $event === 'all' ? '' : String($event))"
    />

    <!-- Clear button -->
    <UButton
      v-if="hasActiveFilters"
      size="sm"
      variant="ghost"
      color="neutral"
      icon="i-lucide-x"
      @click="clearFilters"
    >
      Limpar filtros
    </UButton>
  </div>
</template>
