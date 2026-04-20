import {
  getConversations,
  getConversationById as getConvoAction,
  renameConversation,
  deleteConversationAction,
  getMessages,
} from "@/app/actions";

export async function saveConversation(
  userID: string,
  conversation: any,
  conversationId: string,
) {
  if (!conversationId) return;
  if (conversation?.name) {
    await renameConversation(conversationId, conversation.name);
  }
}

export async function getConversationsForUser(userId: string) {
  try {
    const res = await getConversations();
    if (res.success && res.data) {
      return res.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to get conversations:", error);
    return [];
  }
}

export async function getConversationById(userId: string, id: string) {
  try {
    const convoRes = await getConvoAction(id);
    if (convoRes.success && convoRes.data) {
      const messagesRes = await getMessages(id);
      return {
        ...convoRes.data,
        messages:
          messagesRes.success && messagesRes.data ? messagesRes.data : [],
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get conversation by id:", error);
    return null;
  }
}

export async function deleteConversation(
  userID: string,
  conversationId: string,
) {
  try {
    await deleteConversationAction(conversationId);
  } catch (error) {
    console.error("Failed to delete conversation:", error);
  }
}
