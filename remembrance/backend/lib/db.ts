import { db } from "@/backend/firebaseConfig";
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
// import type { Conversation } from "".

export async function saveConversation(userID: string, conversation: any, conversationId: string) {
    const ref = doc(db, "users", userID, "conversations", conversationId);
    await setDoc(ref, conversation);
}

export async function getConversationsForUser(userId: string) {
    const snapshot = await getDocs(collection(db, "users", userId, "conversations")); // conversationId
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getConversationById(userId: string, id: string) {
    const ref = doc(db, "users", userId, "conversations", id);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
        return null;
    }
    return docSnap.data();
}

export async function deleteConversation(userID: string, conversationId: string) {
    const ref = doc(db, "users", userID, "conversations", conversationId);
    await deleteDoc(ref);
}