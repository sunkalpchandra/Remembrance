

export interface SideBarBaseProps {
    text: string
    iconURL: string
}

//Base meaning on the bottom of the sidebar
export function BaseSideBar(props : SideBarBaseProps) {


    return <div className = "w-full flex flex-row p-2 justify-between hover:bg-[#DEDEDE] transition-colors duration-300">
                <img src={props.iconURL} alt="" />
        <p>{props.text}</p>

    </div>
}