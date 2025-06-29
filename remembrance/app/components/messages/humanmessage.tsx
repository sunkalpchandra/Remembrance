import { ConversationMessage } from "@/app/lib/types"
import { UserProfile } from "../userprofile"



interface HumanMessageProps {
    message : ConversationMessage
}

export function HumanMessage(props: HumanMessageProps){


    return <div className = "bg-[#f4f3f1] p-3 text-[#7E7E7E] w-[80%] rounded-xl text-lg shadow-md flex flex-row gap-5 items-start grow-0 ">
        <UserProfile></UserProfile>
        <p>{props.message.text}</p>
    </div>
}