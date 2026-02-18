<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'require-users-read']
})

const toast = useToast()
const { can } = usePermissions()

// Fetch users and roles
const { data: users, refresh: refreshUsers } = await useFetch('/api/admin/users')
const { data: roles } = await useFetch('/api/admin/roles')

// Search and filters
const search = ref('')
const selectedStatus = ref('all')

// Filtered users
const filteredUsers = computed(() => {
  if (!users.value?.data) return []

  return users.value.data.filter((user: any) => {
    const matchesSearch = !search.value ||
      user.name?.toLowerCase().includes(search.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.value.toLowerCase())

    const matchesStatus = selectedStatus.value === 'all' || user.status === selectedStatus.value

    return matchesSearch && matchesStatus
  })
})

// Invite modal
const isInviteModalOpen = ref(false)
const inviteForm = ref({
  email: '',
  name: '',
  role_ids: [] as string[]
})

async function sendInvite() {
  try {
    await $fetch('/api/admin/users/invite', {
      method: 'POST',
      body: inviteForm.value
    })

    toast.add({
      title: 'Convite enviado',
      description: `Convite enviado para ${inviteForm.value.email}`,
      color: 'success'
    })

    isInviteModalOpen.value = false
    inviteForm.value = { email: '', name: '', role_ids: [] }
    await refreshUsers()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao enviar convite',
      description: error.data?.message || 'Tente novamente',
      color: 'error'
    })
  }
}

// Edit user
const editingUser = ref<any>(null)
const isEditModalOpen = ref(false)

function openEditModal(user: any) {
  editingUser.value = { ...user }
  isEditModalOpen.value = true
}

async function updateUser() {
  try {
    await $fetch(`/api/admin/users/${editingUser.value.id}`, {
      method: 'PATCH',
      body: {
        name: editingUser.value.name,
        status: editingUser.value.status
      }
    })

    toast.add({ title: 'Usuário atualizado', color: 'success' })
    isEditModalOpen.value = false
    await refreshUsers()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao atualizar usuário',
      description: error.data?.message || 'Tente novamente',
      color: 'error'
    })
  }
}

// Delete user
async function deleteUser(userId: string, userName: string) {
  if (!confirm(`Tem certeza que deseja deletar o usuário ${userName}?`)) return

  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    toast.add({ title: 'Usuário deletado', color: 'success' })
    await refreshUsers()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao deletar usuário',
      description: error.data?.message || 'Tente novamente',
      color: 'error'
    })
  }
}

// Manage roles
const managingRolesUser = ref<any>(null)
const isRolesModalOpen = ref(false)
const selectedRoleIds = ref<string[]>([])

function openRolesModal(user: any) {
  managingRolesUser.value = user
  selectedRoleIds.value = user.roles?.map((r: any) => r.id) || []
  isRolesModalOpen.value = true
}

async function updateUserRoles() {
  try {
    await $fetch(`/api/admin/users/${managingRolesUser.value.id}/roles`, {
      method: 'PATCH',
      body: { role_ids: selectedRoleIds.value }
    })

    toast.add({ title: 'Permissões atualizadas', color: 'success' })
    isRolesModalOpen.value = false
    await refreshUsers()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao atualizar permissões',
      description: error.data?.message || 'Tente novamente',
      color: 'error'
    })
  }
}

// Status badge color
function getStatusColor(status: string): 'success' | 'primary' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    invited: 'primary',
    suspended: 'warning',
    deleted: 'error'
  }
  return colors[status] || 'neutral'
}

// Format date
function formatDate(date: string | null) {
  if (!date) return 'Nunca'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Usuários
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Gerencie os usuários da sua empresa
        </p>
      </div>
      <UButton
        v-if="can('users.invite')"
        icon="i-lucide-user-plus"
        size="lg"
        @click="isInviteModalOpen = true"
      >
        Convidar Usuário
      </UButton>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="md:col-span-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Buscar por nome ou email..."
          size="lg"
        />
      </div>
      <USelect
        v-model="selectedStatus"
        :items="[
          { label: 'Todos os status', value: 'all' },
          { label: 'Ativos', value: 'active' },
          { label: 'Convidados', value: 'invited' },
          { label: 'Suspensos', value: 'suspended' }
        ]"
        value-key="value"
        size="lg"
      />
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p class="text-2xl font-bold">{{ users?.data?.length || 0 }}</p>
          </div>
          <UIcon name="i-lucide-users" class="w-8 h-8 text-(--ui-primary)" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Ativos</p>
            <p class="text-2xl font-bold">
              {{ users?.data?.filter((u: any) => u.status === 'active').length || 0 }}
            </p>
          </div>
          <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-600" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Convidados</p>
            <p class="text-2xl font-bold">
              {{ users?.data?.filter((u: any) => u.status === 'invited').length || 0 }}
            </p>
          </div>
          <UIcon name="i-lucide-mail" class="w-8 h-8 text-(--ui-primary)" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Suspensos</p>
            <p class="text-2xl font-bold">
              {{ users?.data?.filter((u: any) => u.status === 'suspended').length || 0 }}
            </p>
          </div>
          <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-orange-600" />
        </div>
      </UCard>
    </div>

    <!-- Users Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Usuário
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Status
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Permissões
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Último Login
              </th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :alt="user.name || user.email"
                    :src="user.avatar_url || undefined"
                    size="md"
                  />
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ user.name || 'Sem nome' }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <UBadge :color="getStatusColor(user.status)" variant="subtle">
                  {{ user.status === 'active' ? 'Ativo' :
                     user.status === 'invited' ? 'Convidado' :
                     user.status === 'suspended' ? 'Suspenso' : user.status }}
                </UBadge>
              </td>
              <td class="py-3 px-4">
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="role in user.roles?.slice(0, 2)"
                    :key="role.id"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  >
                    {{ role.name }}
                  </UBadge>
                  <UBadge
                    v-if="user.roles?.length > 2"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  >
                    +{{ user.roles.length - 2 }}
                  </UBadge>
                </div>
              </td>
              <td class="py-3 px-4">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDate(user.last_login_at) }}
                </p>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    v-if="can('users.update')"
                    icon="i-lucide-shield"
                    color="primary"
                    variant="ghost"
                    size="sm"
                    title="Gerenciar permissões"
                    @click="openRolesModal(user)"
                  />
                  <UButton
                    v-if="can('users.update')"
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    title="Editar usuário"
                    @click="openEditModal(user)"
                  />
                  <UButton
                    v-if="can('users.delete')"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="sm"
                    title="Deletar usuário"
                    @click="deleteUser(user.id, user.name || user.email)"
                  />
                  <span
                    v-if="!can('users.update') && !can('users.delete')"
                    class="text-xs text-(--ui-text-muted)"
                  >Somente leitura</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="!filteredUsers.length"
          class="text-center py-12 text-gray-500"
        >
          <UIcon name="i-lucide-users" class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum usuário encontrado</p>
        </div>
      </div>
    </UCard>

    <!-- Invite Modal -->
    <UModal v-model:open="isInviteModalOpen">
      <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Convidar Novo Usuário</h3>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Email *</label>
            <UInput
              v-model="inviteForm.email"
              type="email"
              placeholder="usuario@exemplo.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Nome</label>
            <UInput
              v-model="inviteForm.name"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Permissões</label>
            <div class="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <label
                v-for="role in (roles as any)?.data"
                :key="role.id"
                class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
              >
                <UCheckbox
                  :model-value="inviteForm.role_ids.includes(role.id)"
                  @update:model-value="(checked) => {
                    if (checked === true) inviteForm.role_ids.push(role.id)
                    else inviteForm.role_ids = inviteForm.role_ids.filter((id: string) => id !== role.id)
                  }"
                />
                <div class="flex-1">
                  <p class="font-medium">{{ role.name }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{{ role.description }}</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isInviteModalOpen = false">
              Cancelar
            </UButton>
            <UButton icon="i-lucide-send" :disabled="!inviteForm.email" @click="sendInvite">
              Enviar Convite
            </UButton>
          </div>
        </template>
      </UCard>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditModalOpen">
      <template #content>
      <UCard v-if="editingUser">
        <template #header>
          <h3 class="text-lg font-semibold">Editar Usuário</h3>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Nome</label>
            <UInput v-model="editingUser.name" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <UInput v-model="editingUser.email" disabled />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Status</label>
            <USelect
              v-model="editingUser.status"
              :items="[
                { label: 'Ativo', value: 'active' },
                { label: 'Suspenso', value: 'suspended' }
              ]"
              value-key="value"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">
              Cancelar
            </UButton>
            <UButton @click="updateUser">
              Salvar
            </UButton>
          </div>
        </template>
      </UCard>
      </template>
    </UModal>

    <!-- Roles Modal -->
    <UModal v-model:open="isRolesModalOpen">
      <template #content>
      <UCard v-if="managingRolesUser">
        <template #header>
          <h3 class="text-lg font-semibold">
            Gerenciar Permissões — {{ managingRolesUser.name || managingRolesUser.email }}
          </h3>
        </template>

        <div class="space-y-2 max-h-96 overflow-y-auto">
          <label
            v-for="role in (roles as any)?.data"
            :key="role.id"
            class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition-colors"
          >
            <UCheckbox
              :model-value="selectedRoleIds.includes(role.id)"
              @update:model-value="(checked) => {
                if (checked === true) selectedRoleIds.push(role.id)
                else selectedRoleIds = selectedRoleIds.filter((id: string) => id !== role.id)
              }"
            />
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">{{ role.name }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ role.description }}</p>
            </div>
          </label>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isRolesModalOpen = false">
              Cancelar
            </UButton>
            <UButton @click="updateUserRoles">
              Salvar Permissões
            </UButton>
          </div>
        </template>
      </UCard>
      </template>
    </UModal>
  </div>
</template>
