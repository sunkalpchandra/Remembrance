export type User =  {
    name : string,
    email : string,
    
}

//chat
export interface ConversationMessage {
    [x: string]: any
    text: string,
    sentByUser: boolean
}
export interface Conversation {
    name: string,
    date: Date,
    messages: ConversationMessage[],
    latestMemories?: Array<{
        title: string,
        memoryText: string,
    }>
}


//memories
//this will all be better represented in whatever actual database is used, but for now this is good enough to prototype on

export interface MemoriesRepo {
    memories:Topic
}
export interface Topic {
    id?: any,
    name: string,
    children: Array<Memory | Topic>,
    content?: string 
}
export interface Memory {
    id: any,
    ownerID: any
    name: string,
    summary: string,
    content: any,//TODO probably better to swap this later to something more capable of representing all the elements other than text
    topics: Topic[]
}
// export interface Person {
//     name: string
// }



export interface Command {
    name: string
    summary: string
    params: CommandParamater[]
    run( params : String[]) : String
}
export interface CommandParamater {
    name: string
}