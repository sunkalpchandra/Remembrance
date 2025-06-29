

export interface SideBarChoiceProps {
    text : string
    iconPath : string
    link: string
    tag? : string
    tagcolor: string
    selected: boolean
    collapsed: boolean
}
export default function SideBarChoice(props : SideBarChoiceProps ) {
    return <div className = "w-full flex flex-row justify-between items-center p-2 cursor-pointer" style = {{
        backgroundColor: props.selected ? "#DEDEDE" : ""
    }} onClick = {
        () => {
            window.location.href = props.link
        }
    }>{!props.collapsed && 
        <p>{props.text}</p>}
        <div className = " flex flex-row  items-center">
            {
                (props.tag != undefined && !props.collapsed) && <div style = {{
                    backgroundColor: props.tagcolor
                }} className = {` p-1  rounded-md mx-2 text-white text-center align-middle text-[10px]`}>{props.tag}</div>
            }
            <img src = {props.iconPath} className = "w-[1vw] aspect-square"></img>
        </div>
    </div>

}