import { getUserPermissions } from '../server/utils/authorization'

const PLATFORM_ADMIN_ID = '8ed6c8ad-a4d4-4214-be98-7eabd05d840d'

async function test() {
  console.log('Testing getUserPermissions for Platform Admin...\n')

  try {
    const permissions = await getUserPermissions(PLATFORM_ADMIN_ID)

    console.log(`Total permissions: ${permissions.length}`)
    console.log('\nAll permissions:')
    permissions.forEach(p => console.log(`  - ${p}`))

    console.log('\nPlatform permissions:')
    const platformPerms = permissions.filter(p => p.startsWith('platform.'))
    platformPerms.forEach(p => console.log(`  - ${p}`))

    if (platformPerms.length === 0) {
      console.log('\n❌ No platform permissions found!')
    } else {
      console.log(`\n✅ Found ${platformPerms.length} platform permissions`)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

test()
