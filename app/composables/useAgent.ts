import type { AgentConfig } from '~~/server/types'

export function useAgent() {
  async function getAgentConfigs(clientId: string) {
    return useFetch(`/api/agents/${clientId}/config`, {
      headers: useAdminHeaders()
    })
  }

  async function updateAgentConfig(clientId: string, configId: string, updates: Partial<AgentConfig>) {
    return $fetch(`/api/agents/${clientId}/config`, {
      method: 'PATCH',
      headers: useAdminHeaders(),
      body: { config_id: configId, ...updates }
    })
  }

  async function createAgent(data: { name: string; system_prompt?: string }) {
    return $fetch('/api/admin/agents', {
      method: 'POST',
      headers: useAdminHeaders(),
      body: data
    })
  }

  async function deleteAgent(configId: string) {
    return $fetch(`/api/admin/agents/${configId}`, {
      method: 'DELETE',
      headers: useAdminHeaders()
    })
  }

  async function getKnowledge(agentId: string) {
    return $fetch(`/api/admin/agents/${agentId}/knowledge`, {
      headers: useAdminHeaders()
    })
  }

  async function addKnowledge(agentId: string, data: { title: string; content: string; content_type: string }) {
    return $fetch(`/api/admin/agents/${agentId}/knowledge`, {
      method: 'POST',
      headers: useAdminHeaders(),
      body: data
    })
  }

  async function updateKnowledge(agentId: string, entryId: string, data: { title?: string; content?: string; content_type?: string }) {
    return $fetch(`/api/admin/agents/${agentId}/knowledge/${entryId}`, {
      method: 'PATCH',
      headers: useAdminHeaders(),
      body: data
    })
  }

  async function deleteKnowledge(agentId: string, entryId: string) {
    return $fetch(`/api/admin/agents/${agentId}/knowledge/${entryId}`, {
      method: 'DELETE',
      headers: useAdminHeaders()
    })
  }

  async function uploadDocument(agentId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    return $fetch(`/api/admin/agents/${agentId}/knowledge/upload`, {
      method: 'POST',
      body: formData
    })
  }

  async function connectWhatsApp(agentId: string) {
    return $fetch(`/api/admin/agents/${agentId}/whatsapp/connect`, {
      method: 'POST'
    })
  }

  async function getWhatsAppStatus(agentId: string) {
    return $fetch(`/api/admin/agents/${agentId}/whatsapp/status`)
  }

  async function disconnectWhatsApp(agentId: string) {
    return $fetch(`/api/admin/agents/${agentId}/whatsapp/disconnect`, {
      method: 'POST'
    })
  }

  async function refreshWhatsAppQr(agentId: string) {
    return $fetch(`/api/admin/agents/${agentId}/whatsapp/qrcode`)
  }

  async function getWidgetScript(agentId: string) {
    return $fetch<{ embedCode: string }>(`/api/admin/agents/${agentId}/widget`)
  }

  return {
    getAgentConfigs,
    updateAgentConfig,
    createAgent,
    deleteAgent,
    getKnowledge,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    uploadDocument,
    connectWhatsApp,
    getWhatsAppStatus,
    disconnectWhatsApp,
    refreshWhatsAppQr,
    getWidgetScript
  }
}

function useAdminHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' }
}
