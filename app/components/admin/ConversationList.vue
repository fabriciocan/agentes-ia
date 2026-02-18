<script setup lang="ts">
defineProps<{
  conversations: Array<{
    id: string
    user_name: string | null
    agent_name: string | null
    channel: string
    status: string
    message_count: number
    updated_at: string
  }>
  total: number
  loading?: boolean
}>()

const emit = defineEmits<{
  pageChange: [page: number]
  view: [id: string]
}>()

const page = ref(1)

const columns = [
  { accessorKey: 'user_name', header: 'User' },
  { accessorKey: 'agent_name', header: 'Agent' },
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'message_count', header: 'Messages' },
  { accessorKey: 'updated_at', header: 'Last Activity' },
  { id: 'actions', header: '' }
]

function changePage(newPage: number) {
  page.value = newPage
  emit('pageChange', newPage)
}
</script>

<template>
  <div>
    <UTable
      :data="conversations"
      :columns="columns"
      :loading="loading"
    >
      <template #user_name-cell="{ row }">
        {{ row.original.user_name || 'Anonymous' }}
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :color="row.original.status === 'active' ? 'success' : 'neutral'"
          variant="subtle"
        >
          {{ row.original.status }}
        </UBadge>
      </template>
      <template #updated_at-cell="{ row }">
        {{ new Date(row.original.updated_at).toLocaleString() }}
      </template>
      <template #actions-cell="{ row }">
        <UButton
          variant="ghost"
          icon="i-lucide-eye"
          size="xs"
          @click="emit('view', row.original.id)"
        />
      </template>
    </UTable>

    <div
      v-if="total > 20"
      class="flex justify-center mt-4"
    >
      <UPagination
        :model-value="page"
        :total="total"
        :items-per-page="20"
        @update:model-value="changePage"
      />
    </div>
  </div>
</template>
