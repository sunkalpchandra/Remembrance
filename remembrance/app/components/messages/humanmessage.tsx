import { ConversationMessage } from "@/app/lib/types";
import { UserProfile } from "../userprofile";

interface HumanMessageProps {
  message: ConversationMessage;
}

export function HumanMessage(props: HumanMessageProps) {
  return (
    <div className="bg-white/90 border border-gray-200 p-4 text-gray-700 w-[80%] rounded-2xl text-base shadow-sm flex flex-row gap-2 items-center grow-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in">
      {/* <UserProfile /> */}
      <p className="whitespace-pre-line leading-relaxed">
        {props.message.text}
      </p>
    </div>
  );
}
