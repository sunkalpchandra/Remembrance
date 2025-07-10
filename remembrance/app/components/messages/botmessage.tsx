import { ConversationMessage } from "@/app/lib/types"
import { BotProfile } from "../botprofile"
import { useEffect, useRef } from "react"
import CircleButton from "../circlebutton"
import { IBM } from "@/app/lib/fonts"
import MultiButton from "../multibutton"
import MemoryWidget, { MemoryWidgetProps } from "../memorywidget"

interface BotProps {
    message: ConversationMessage,
    time: number,
    botName: string,
    suggestions: MemoryWidgetProps[]
}

export function BotMessage(props: BotProps) {

    const progressbar = useRef(null as any as HTMLDivElement)
    const start = useRef(new Date());
    
    useEffect(() => {
        if (progressbar.current == null) {
            return
        }
        start.current = new Date();
        let int = setInterval(() => {
            let progress = (new Date().getTime() - start.current.getTime()) / ((props.time + 1) * 1000) * 100
            progressbar.current.style.width = progress + "%";
            if (progress > 100) {
                clearTimeout(int);
            }
        }, 60)
    }, []);

    useEffect(() => {
        const el = progressbar.current;
        if (!el) return;
        el.style.opacity = "1";
    }, []);

    return <div className="text-[#7E7E7E] flex flex-row items-start w-[80%] gap-5 ">
        <BotProfile name="R E">
        </BotProfile>
        <div className="w-full h-full flex flex-col items-start gap-2">
            <div className="w-full flex flex-row items-center ">
                <p className={`grow-0 text-black ${IBM.className} text-sm`}>  {props.botName} · reteena</p>
                {/* <div className="grow shadow-sm rounded-full h-[50%] mx-10">
                    <div ref={progressbar} className="bg-black z-10 h-full rounded-full"></div>
                </div> */}
                <p className={`grow-0 text-black ${IBM.className} text-sm`}>[try to answer in {props.time} seconds]</p>
            </div>
            <p className="w-full">{props.message.text}
            </p>
            {/* <div className="flex flex-row items-center gap-2    ">
                <CircleButton imgURL={"/refresh.svg"} onClick={function (e: any): void {
                    throw new Error("Function not implemented.")
                }} imgAlt={"Reset"} hoverText={"Re-try generation"}>
                </CircleButton>
                <MultiButton imgURLS={[
                    "/thumbs-up.svg",
                    "/thumbs-down.svg"
                ]} imgAlts={[
                    "thumbs up",
                    "thumbs down"
                ]} callBacks={[
                    () => {
                        console.log("thumbs up")
                        //TODO
                        throw new Error("Function not implemented.")
                    },
                    () => {
                        console.log("thumbs down")
                        throw new Error("Function not implemented.")
                    }
                ]}></MultiButton>
                <CircleButton imgURL={"/clock.svg"} onClick={function (e: any): void {
                    throw new Error("Function not implemented.")
                }} imgAlt={"reset timer"} hoverText={"restart time "} black></CircleButton>
            </div> */}
            <div className = " gap-2 mt-2">
                {
                    props.suggestions.length > 0 && (
                        <p className="text-sm text-black mb-5">suggested memories </p>
                    )
                }
                <div className="flex gap-3">
                {
                    props.suggestions.map((suggestion, i) => (
                        <MemoryWidget {...suggestion} key={i} />
                    ))
                }
                </div>
            </div>
        </div>
    </div>
}