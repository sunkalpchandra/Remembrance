"use client";
import { useState } from "react";

interface CircleButtonProps {
  imgURL: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  imgAlt: string;
  hoverText: string;
  popUpAbove?: boolean;
  black?: boolean;
  className?: string;
  imgClassName?: string;
  size?: string;
}

export default function CircleButton(props: CircleButtonProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`relative border-[#dedddb] rounded-full flex items-center p-1 border-1 shadow-black/20 shadow-md cursor-pointer transition-colors duration-300 h-full   hover:bg-[#DEDEDE] ${props.black ? "bg-black hover:bg-gray-800 border-0 shadow-none" : ""} ${props.className} `}
      onClick={props.onClick}
      onMouseLeave={() => {
        setHover(false);
      }}
      onMouseEnter={() => {
        setHover(true);
      }}
    >
      <img
        src={props.imgURL}
        alt={props.imgAlt}
        className={`aspect-square w-[1vw] ` + (props.imgClassName || "")}
      ></img>
      {
        //TODO change font
      }
      {hover && (
        <div
          className={`absolute ${props.popUpAbove ? "bottom-full" : "top-full"} right-[50%] translate-x-[50%]  flex flex-row items-center text-center`}
          style={{
            background: props.popUpAbove
              ? "url(/popup-flip.svg)"
              : "url(/popup.svg)",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          <p
            className={`text-sm text-white px-5 py-3 ${props.popUpAbove ? "mb-2" : "mt-2"}`}
          >
            {props.hoverText}
          </p>
        </div>
      )}
    </div>
  );
}
