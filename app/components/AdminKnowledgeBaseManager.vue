<script setup lang="ts">
const props = defineProps<{
  agentId: string
}>()

const { getKnowledge, addKnowledge, updateKnowledge, deleteKnowledge, uploadDocument, deleteKnowledgeFile } = useAgent()
const toast = useToast()
const { can } = usePermissions()

interface KnowledgeFileItem {
  kind: 'file'
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  content_type: string
  chunk_count: number
  created_at: string
  updated_at: string
}

interface KnowledgeEntryItem {
  kind: 'entry'
  id: string
  title: string
  content: string
  content_type: string
  created_at: string
  updated_at: string
}

type KnowledgeListItem = KnowledgeFileItem | KnowledgeEntryItem

const entries = ref<KnowledgeListItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const showForm = ref(false)
const editingEntry = ref<KnowledgeEntryItem | null>(null)
const selectedFile = ref<File | null>(null)

const form = reactive({
  title: '',
  content: '',
  content_type: 'text'
})

const contentTypeOptions = [
  { label: 'Text', value: 'text' },
  { label: 'FAQ', value: 'faq' },
  { label: 'Document', value: 'document' }
]

const contentTypeBadgeColor: Record<string, 'primary' | 'success' | 'warning'> = {
  text: 'primary',
  faq: 'success',
  document: 'warning'
}

const isDocumentType = computed(() => form.content_type === 'document')

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function fetchEntries() {
  loading.value = true
  try {
    const res = await getKnowledge(props.agentId) as { data: KnowledgeListItem[] }
    entries.value = res.data
  } catch {
    toast.add({ title: 'Failed to load knowledge base', color: 'error' })
  } finally {
    loading.value = false
  }
}

function openAddForm() {
  editingEntry.value = null
  form.title = ''
  form.content = ''
  form.content_type = 'text'
  selectedFile.value = null
  showForm.value = true
}

function openEditForm(item: KnowledgeListItem) {
  if (item.kind === 'file') {
    toast.add({ title: 'Arquivos não podem ser editados. Delete e envie novamente.', color: 'warning' })
    return
  }
  if (item.content_type === 'document') {
    toast.add({ title: 'Document entries cannot be edited. Delete and re-upload instead.', color: 'warning' })
    return
  }
  editingEntry.value = item
  form.title = item.title
  form.content = item.content
  form.content_type = item.content_type
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingEntry.value = null
  selectedFile.value = null
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    if (!form.title) {
      form.title = file.name
    }
  }
}

async function submitForm() {
  // Document upload
  if (form.content_type === 'document' && !editingEntry.value) {
    if (!selectedFile.value) {
      toast.add({ title: 'Please select a file', color: 'error' })
      return
    }

    uploading.value = true
    try {
      await uploadDocument(props.agentId, selectedFile.value)
      toast.add({ title: 'Document uploaded', color: 'success' })
      showForm.value = false
      selectedFile.value = null
      await fetchEntries()
    } catch (error) {
      const err = error as { data?: { statusMessage?: string } }
      toast.add({ title: err.data?.statusMessage || 'Failed to upload document', color: 'error' })
    } finally {
      uploading.value = false
    }
    return
  }

  // Text/FAQ entry
  if (!form.title || !form.content) return

  try {
    if (editingEntry.value) {
      await updateKnowledge(props.agentId, editingEntry.value.id, { ...form })
      toast.add({ title: 'Entry updated', color: 'success' })
    } else {
      await addKnowledge(props.agentId, { ...form })
      toast.add({ title: 'Entry added', color: 'success' })
    }
    showForm.value = false
    editingEntry.value = null
    await fetchEntries()
  } catch {
    toast.add({ title: 'Failed to save entry', color: 'error' })
  }
}

async function removeEntry(item: KnowledgeListItem) {
  try {
    if (item.kind === 'file') {
      await deleteKnowledgeFile(props.agentId, item.id)
      toast.add({ title: 'Arquivo e todos os chunks removidos', color: 'success' })
    } else {
      await deleteKnowledge(props.agentId, item.id)
      toast.add({ title: 'Entry removed', color: 'success' })
    }
    await fetchEntries()
  } catch {
    toast.add({ title: 'Failed to remove item', color: 'error' })
  }
}

watch(() => props.agentId, () => fetchEntries(), { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">
        Knowledge Base
      </h3>
      <UButton
        v-if="can('knowledge.create')"
        icon="i-heroicons-plus"
        size="sm"
        @click="openAddForm"
      >
        Add Entry
      </UButton>
    </div>

    <!-- Add/Edit Form -->
    <UCard v-if="showForm">
      <div class="space-y-4">
        <UFormField label="Type">
          <USelect
            v-model="form.content_type"
            :items="contentTypeOptions"
            :disabled="!!editingEntry"
          />
        </UFormField>

        <UFormField
          v-if="isDocumentType && !editingEntry"
          label="Document File"
          description="Upload .txt, .csv, .pdf, .docx, or .xlsx (max 10MB). Large documents will be chunked automatically."
        >
          <input
            type="file"
            accept=".txt,.csv,.pdf,.docx,.xlsx,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            @change="handleFileChange"
          >
        </UFormField>

        <UFormField
          v-if="isDocumentType && selectedFile"
          label="Document Title"
        >
          <UInput
            v-model="form.title"
            placeholder="Enter a title for this document"
          />
        </UFormField>

        <template v-if="!isDocumentType">
          <UFormField label="Title">
            <UInput
              v-model="form.title"
              placeholder="Entry title"
            />
          </UFormField>

          <UFormField label="Content">
            <UTextarea
              v-model="form.content"
              :rows="8"
              placeholder="Enter the knowledge content..."
            />
          </UFormField>
        </template>

        <div class="flex gap-2 justify-end">
          <UButton
            variant="ghost"
            color="neutral"
            @click="cancelForm"
          >
            Cancel
          </UButton>
          <UButton
            :disabled="isDocumentType ? !selectedFile : (!form.title || !form.content)"
            :loading="uploading"
            @click="submitForm"
          >
            {{ editingEntry ? 'Update' : (isDocumentType ? 'Upload' : 'Add') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Loading -->
    <div
      v-if="loading"
      class="text-center py-8 text-muted"
    >
      Loading...
    </div>

    <!-- Empty state -->
    <div
      v-else-if="entries.length === 0 && !showForm"
      class="text-center py-8 text-muted"
    >
      No knowledge entries yet. Add training content for this agent.
    </div>

    <!-- Entries list -->
    <div
      v-else
      class="space-y-3"
    >
      <template
        v-for="item in entries"
        :key="item.id"
      >
        <!-- Card de arquivo (kind === 'file') -->
        <UCard v-if="item.kind === 'file'">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <UIcon
                  name="i-heroicons-document-text"
                  class="text-warning-500 shrink-0 size-4"
                />
                <span class="font-medium">{{ item.title }}</span>
                <UBadge
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
                  document
                </UBadge>
              </div>
              <div class="flex flex-wrap gap-3 text-xs text-muted mt-1">
                <span>{{ item.file_name }}</span>
                <span>{{ formatFileSize(item.file_size) }}</span>
                <span>{{ item.chunk_count }} chunks</span>
              </div>
            </div>
            <div class="flex gap-1 shrink-0">
              <UButton
                v-if="can('knowledge.delete')"
                icon="i-heroicons-trash"
                variant="ghost"
                size="xs"
                color="error"
                @click="removeEntry(item)"
              />
            </div>
          </div>
        </UCard>

        <!-- Card de entrada standalone (kind === 'entry') -->
        <UCard v-else>
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium">{{ item.title }}</span>
                <UBadge
                  :color="contentTypeBadgeColor[item.content_type] || 'primary'"
                  variant="subtle"
                  size="xs"
                >
                  {{ item.content_type }}
                </UBadge>
              </div>
              <p class="text-sm text-muted truncate">
                {{ item.content.slice(0, 200) }}{{ item.content.length > 200 ? '...' : '' }}
              </p>
            </div>
            <div class="flex gap-1 shrink-0">
              <UButton
                v-if="can('knowledge.update') && item.content_type !== 'document'"
                icon="i-heroicons-pencil-square"
                variant="ghost"
                size="xs"
                color="neutral"
                @click="openEditForm(item)"
              />
              <UButton
                v-if="can('knowledge.delete')"
                icon="i-heroicons-trash"
                variant="ghost"
                size="xs"
                color="error"
                @click="removeEntry(item)"
              />
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>
