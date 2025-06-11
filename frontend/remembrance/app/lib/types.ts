export type User =  {
    name : string,
    email : string,
    
}


export interface ConversationMessage {
    text: string,
    sentByUser: boolean
}
export interface Conversation {
    name: string,
    date: Date,
    messages: ConversationMessage[]
}