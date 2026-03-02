import { prisma } from '../../lib/prisma'
import { requirePermission } from '../../utils/authorization'
import { platformCompanyCreateSchema } from '../../utils/validation'
import { createCompany } from '../../services/company.service'
import { createUserWithPassword } from '../../services/user.service'
import { createLogger } from '../../utils/logger'

const logger = createLogger('platform:companies:create')

/**
 * POST /api/platform/companies
 *
 * Creates a new company with an admin user (platform admin only).
 * Returns the provisional password for the admin user (shown once only).
 *
 * Requires: platform.manage_companies permission
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  // Platform routes use manual session injection (same pattern as companies.get.ts)
  event.context.user = session.user as typeof event.context.user

  await requirePermission(event, 'platform.manage_companies')

  const body = await readBody(event)
  const parsed = platformCompanyCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos',
      data: parsed.error.flatten()
    })
  }

  const { name, slug, logo_url, admin_email, admin_name } = parsed.data

  // Fetch the platform client to use as the parent for all companies
  const platformClient = await prisma.clients.findUnique({ where: { slug: 'platform' } })
  if (!platformClient) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Client platform não encontrado. Execute o seed do banco de dados.'
    })
  }

  // Fetch the company-admin system role
  const companyAdminRole = await prisma.roles.findFirst({
    where: { slug: 'company-admin', is_system: true }
  })
  if (!companyAdminRole) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Role company-admin não encontrada. Execute o seed do banco de dados.'
    })
  }

  try {
    // Create the company linked to the platform client
    const company = await createCompany(platformClient.id, {
      name,
      slug,
      logo_url: logo_url || undefined
    })

    // Create the admin user with a provisional password
    const platformAdminId = (session.user as { id?: string }).id || 'system'
    const { user: adminUser, provisionalPassword } = await createUserWithPassword(
      company.id,
      platformAdminId,
      {
        email: admin_email,
        name: admin_name,
        roleIds: [companyAdminRole.id]
      }
    )

    logger.info(
      { companyId: company.id, adminUserId: adminUser.id, adminEmail: admin_email },
      'Company created with admin user'
    )

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url,
        status: company.status,
        client_id: company.client_id
      },
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        status: adminUser.status
      },
      provisionalPassword,
      message: 'Empresa criada com sucesso. Senha provisória exibida apenas uma vez.'
    }
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation (slug already exists)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Já existe uma empresa com este slug neste cliente'
      })
    }

    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    logger.error({ error, name, slug }, 'Failed to create company')
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar empresa' })
  }
})
