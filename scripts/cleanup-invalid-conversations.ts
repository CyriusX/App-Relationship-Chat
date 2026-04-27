/**
 * Script to clean up conversations with invalid (non-UUID) IDs
 *
 * Run with: npx ts-node scripts/cleanup-invalid-conversations.ts
 */

import { PrismaClient } from '../src/infrastructure/database/generated'

const prisma = new PrismaClient()

// Regex for UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function main() {
  console.log('🔍 Searching for conversations with invalid IDs...\n')

  // Get all conversations
  const allConversations = await prisma.conversation.findMany({
    select: { id: true },
  })

  console.log(`📊 Total conversations found: ${allConversations.length}`)

  // Filter invalid IDs
  const invalidConversations = allConversations.filter((c) => !UUID_REGEX.test(c.id))

  if (invalidConversations.length === 0) {
    console.log('\n✅ No invalid conversations found!')
    return
  }

  console.log(`\n❌ Found ${invalidConversations.length} conversations with invalid IDs:`)
  invalidConversations.forEach((c) => {
    console.log(`   - ${c.id}`)
  })

  // Delete related messages first (due to foreign key constraints)
  console.log('\n🗑️  Deleting related messages...')

  for (const conv of invalidConversations) {
    const deletedMessages = await prisma.message.deleteMany({
      where: { conversationId: conv.id },
    })
    console.log(`   - Deleted ${deletedMessages.count} messages from conversation ${conv.id}`)
  }

  // Delete invalid conversations
  console.log('\n🗑️  Deleting invalid conversations...')

  for (const conv of invalidConversations) {
    await prisma.conversation.delete({
      where: { id: conv.id },
    })
    console.log(`   - Deleted conversation: ${conv.id}`)
  }

  console.log('\n✅ Cleanup complete!')
}

main()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
