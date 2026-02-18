// Filtro padrão para tabelas com soft-delete (users, companies, agent_configs, roles)
// Uso: where: { ...notDeleted, companyId }
export const notDeleted = { deleted_at: null } as const
