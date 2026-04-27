import { PrismaClient } from '../generated';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test conversations
  const conversation1 = await prisma.conversation.upsert({
    where: { id: 'conv-test-1' },
    update: {},
    create: {
      id: 'conv-test-1',
      userAId: 'user-test-1',
      userBId: 'user-test-2',
      matchId: 'match-test-1',
      lastMessageAt: new Date(),
    },
  });

  const conversation2 = await prisma.conversation.upsert({
    where: { id: 'conv-test-2' },
    update: {},
    create: {
      id: 'conv-test-2',
      userAId: 'user-test-1',
      userBId: 'user-test-3',
      matchId: 'match-test-2',
      lastMessageAt: new Date(),
    },
  });

  // Create test messages
  await prisma.message.upsert({
    where: { id: 'msg-test-1' },
    update: {},
    create: {
      id: 'msg-test-1',
      conversationId: conversation1.id,
      senderId: 'user-test-1',
      content: 'Hello! How are you?',
      type: 'TEXT',
      status: 'READ',
    },
  });

  await prisma.message.upsert({
    where: { id: 'msg-test-2' },
    update: {},
    create: {
      id: 'msg-test-2',
      conversationId: conversation1.id,
      senderId: 'user-test-2',
      content: 'Hi! I am doing great, thanks for asking!',
      type: 'TEXT',
      status: 'READ',
    },
  });

  await prisma.message.upsert({
    where: { id: 'msg-test-3' },
    update: {},
    create: {
      id: 'msg-test-3',
      conversationId: conversation1.id,
      senderId: 'user-test-1',
      content: 'Would you like to grab coffee sometime?',
      type: 'TEXT',
      status: 'DELIVERED',
    },
  });

  await prisma.message.upsert({
    where: { id: 'msg-test-4' },
    update: {},
    create: {
      id: 'msg-test-4',
      conversationId: conversation2.id,
      senderId: 'user-test-1',
      content: 'Hey! Nice to match with you!',
      type: 'TEXT',
      status: 'SENT',
    },
  });

  console.log('Seeding complete!');
  console.log('Created conversations:', [conversation1.id, conversation2.id]);
  console.log('Test users: user-test-1, user-test-2, user-test-3');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
