// One place for room names, so a typo can't split the system in two.
export const userRoom = (userId: string): string => `user:${userId}`;

export const conversationRoom = (conversationId: string): string =>
    `conversation:${conversationId}`;