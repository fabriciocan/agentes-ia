import { prisma } from '../../lib/prisma'
import type { Client } from '../../types'

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const params = getQuery(event)
  const instanceName = params.instance_name as string | undefined
  const phone = params.phone as string | undefined

  if (!instanceName && !phone) {
    throw createError({ statusCode: 400, statusMessage: 'instance_name or phone query param required' })
  }

  const agent = await prisma.agent_configs.findFirst({
    where: {
      client_id: client.id,
      is_active: true,
      ...(instanceName
        ? { whatsapp_instance_name: instanceName }
        : { whatsapp_number: phone })
    },
    select: {
      id: true,
      client_id: true,
      name: true,
      system_prompt: true,
      personality: true,
      tone: true,
      language: true,
      whatsapp_instance_name: true,
      whatsapp_number: true
    }
  })

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'No agent found for this WhatsApp instance' })
  }

  return {
    data: {
      agent_config_id: agent.id,
      client_id: agent.client_id,
      name: agent.name,
      system_prompt: agent.system_prompt,
      personality: agent.personality,
      tone: agent.tone,
      language: agent.language,
      whatsapp_instance_name: agent.whatsapp_instance_name,
      whatsapp_number: agent.whatsapp_number
    }
  }
})
