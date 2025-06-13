

export interface SideBarChoiceProps {
    text : string
    iconPath : string
    link: string
    tag? : string
    tagcolor: string
    selected: boolean
}
export default function SideBarChoice(props : SideBarChoiceProps ) {
    return <div className = "w-full flex flex-row justify-between items-center p-2 cursor-pointer" style = {{
        backgroundColor: props.selected ? "#DEDEDE" : ""
    }} onClick = {
        () => {
            window.location.href = props.link
        }
    }>
        <p>{props.text}</p>
        <div className = " flex flex-row  items-center">
            {
                props.tag != undefined && <div style = {{
                    backgroundColor: props.tagcolor
                }} className = {` px-2 rounded-md mx-2 text-white text-center align-middle text-[8px]`}>{props.tag}</div>
            }
            <img src = {props.iconPath} className = "w-[1vw] aspect-square"></img>
        </div>
    </div>

}