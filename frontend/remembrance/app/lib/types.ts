export type User =  {
    name : string,
    email : string,
    
}

//chat
export interface ConversationMessage {
    text: string,
    sentByUser: boolean
}
export interface Conversation {
    name: string,
    date: Date,
    messages: ConversationMessage[]
}


//memories
//this will all be better represented in whatever actual database is used, but for now this is good enough to prototype on

export interface MemoriesRepo {
    memories:Topic
}
export interface Topic {
    name: string,
    contents: Array<Memory | Topic>
}
export interface Memory {
    symbol: string
    name: string,
    summary: string
    content: string//TODO probably better to swap this later to something more capable of representing all the elements other than text
    topics: Topic[]
}
// export interface Person {
//     name: string
// }
