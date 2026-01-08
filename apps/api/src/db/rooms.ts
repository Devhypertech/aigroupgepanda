import { prisma } from './client';
import { RoomTemplate } from '@gepanda/shared';

export async function getOrCreateRoom(
  roomId: string,
  template: RoomTemplate
): Promise<{ id: string; roomId: string; template: string }> {
  const room = await prisma.room.upsert({
    where: { roomId },
    update: {},
    create: {
      roomId,
      template,
    },
  });

  return room;
}

export async function addRoomMember(
  roomId: string,
  userId: string,
  username: string
): Promise<void> {
  // First ensure room exists (will be created by getOrCreateRoom)
  const room = await prisma.room.findUnique({ where: { roomId } });
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  await prisma.roomMember.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {},
    create: {
      roomId,
      userId,
      username,
    },
  });
}

export async function getRoomMessages(roomId: string, limit: number = 50, beforeMessageId?: string) {
  const where: any = {
    roomId,
    isDeleted: false,
  };

  if (beforeMessageId) {
    const beforeMessage = await prisma.message.findUnique({
      where: { id: beforeMessageId },
      select: { createdAt: true },
    });
    if (beforeMessage) {
      where.createdAt = { lt: beforeMessage.createdAt };
    }
  }

  return await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      reactions: {
        select: {
          emoji: true,
          userId: true,
          username: true,
        },
      },
    },
  });
}

export async function getRoomTemplate(roomId: string): Promise<RoomTemplate> {
  const room = await prisma.room.findUnique({
    where: { roomId },
    select: { template: true },
  });
  return (room?.template as RoomTemplate) || RoomTemplate.TRAVEL_PLANNING;
}

export async function createMessage(data: {
  roomId: string;
  userId: string;
  username: string;
  text: string;
  kind: 'USER' | 'AI';
}) {
  return await prisma.message.create({
    data: {
      roomId: data.roomId,
      userId: data.userId,
      username: data.username,
      text: data.text,
      kind: data.kind,
    },
  });
}

export async function getRoomMembers(roomId: string) {
  return await prisma.roomMember.findMany({
    where: { roomId },
    select: {
      userId: true,
      username: true,
    },
    distinct: ['userId'],
  });
}

export async function editMessage(messageId: string, userId: string, newText: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.userId !== userId) {
    throw new Error('Not authorized to edit this message');
  }

  if (message.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }

  return await prisma.message.update({
    where: { id: messageId },
    data: {
      text: newText,
      editedAt: new Date(),
    },
    include: {
      reactions: {
        select: {
          emoji: true,
          userId: true,
          username: true,
        },
      },
    },
  });
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.userId !== userId) {
    throw new Error('Not authorized to delete this message');
  }

  return await prisma.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      text: '[Message deleted]',
    },
  });
}

export async function addMessageReaction(
  messageId: string,
  userId: string,
  username: string,
  emoji: string
) {
  return await prisma.messageReaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
    update: {},
    create: {
      messageId,
      userId,
      username,
      emoji,
    },
  });
}

export async function removeMessageReaction(messageId: string, userId: string, emoji: string) {
  return await prisma.messageReaction.deleteMany({
    where: {
      messageId,
      userId,
      emoji,
    },
  });
}

export async function getMessageReactions(messageId: string) {
  return await prisma.messageReaction.findMany({
    where: { messageId },
    select: {
      emoji: true,
      userId: true,
      username: true,
    },
  });
}

