function storageKey(userID: string, conversationId?: string) {
  return conversationId
    ? `conv:${userID}:${conversationId}`
    : `conv-index:${userID}`;
}

function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      typeof window.localStorage.getItem === "function"
    );
  } catch {
    return false;
  }
}

function readIndex(userID: string): string[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userID));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIndex(userID: string, ids: string[]) {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(storageKey(userID), JSON.stringify(ids));
  } catch {}
}

export async function saveConversation(
  userID: string,
  conversation: any,
  conversationId: string,
) {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(
      storageKey(userID, conversationId),
      JSON.stringify(conversation),
    );
    const ids = readIndex(userID);
    if (!ids.includes(conversationId)) {
      ids.push(conversationId);
      writeIndex(userID, ids);
    }
  } catch {}
}

export async function getConversationsForUser(userId: string) {
  if (!isLocalStorageAvailable()) return [];
  try {
    const ids = readIndex(userId);
    return ids
      .map((id) => {
        try {
          const raw = window.localStorage.getItem(storageKey(userId, id));
          if (!raw) return null;
          return { id, ...JSON.parse(raw) };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as any[];
  } catch {
    return [];
  }
}

export async function getConversationById(userId: string, id: string) {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId, id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function deleteConversation(
  userID: string,
  conversationId: string,
) {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(storageKey(userID, conversationId));
    writeIndex(
      userID,
      readIndex(userID).filter((id) => id !== conversationId),
    );
  } catch {}
}
