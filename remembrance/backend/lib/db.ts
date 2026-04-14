function storageKey(userID: string, conversationId?: string) {
  return conversationId
    ? `conv:${userID}:${conversationId}`
    : `conv-index:${userID}`;
}

function readIndex(userID: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(userID));
  return raw ? JSON.parse(raw) : [];
}

function writeIndex(userID: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userID), JSON.stringify(ids));
}

export async function saveConversation(
  userID: string,
  conversation: any,
  conversationId: string,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey(userID, conversationId),
    JSON.stringify(conversation),
  );
  const ids = readIndex(userID);
  if (!ids.includes(conversationId)) {
    ids.push(conversationId);
    writeIndex(userID, ids);
  }
}

export async function getConversationsForUser(userId: string) {
  if (typeof window === "undefined") return [];
  const ids = readIndex(userId);
  return ids
    .map((id) => {
      const raw = window.localStorage.getItem(storageKey(userId, id));
      if (!raw) return null;
      return { id, ...JSON.parse(raw) };
    })
    .filter(Boolean) as any[];
}

export async function getConversationById(userId: string, id: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(userId, id));
  return raw ? JSON.parse(raw) : null;
}

export async function deleteConversation(
  userID: string,
  conversationId: string,
) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userID, conversationId));
  writeIndex(
    userID,
    readIndex(userID).filter((id) => id !== conversationId),
  );
}
