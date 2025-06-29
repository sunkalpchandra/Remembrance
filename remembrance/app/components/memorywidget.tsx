export interface MemoryWidgetProps {
  person: string;
  name: string;
  href: string;
  color: string;
}
export default function MemoryWidget(props: MemoryWidgetProps) {
  return (
    <div className="bg-[#f9fafb] rounded-md flex flex-row items-start w-[15vw] justify-between h-[4vw] overflow-hidden text-sm">
      <div className="flex flex-col items-start justify-center max-w-[80%] text-ellipsis wrap-anywhere">
        <div
          style={{
            backgroundColor: props.color,
          }}
          className="px-2 py-1"
        >
          {props.person}
        </div>
        <div className="text-black text-ellipsis ">{props.name.length > 49 ? props.name.substring(0, 49) + "...": props.name}</div>
      </div>
      <img></img>
    </div>
  );
}
