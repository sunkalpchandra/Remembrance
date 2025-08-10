import { useState } from "react";

interface Multibutton {
  imgURLS: string[];
  imgAlts: string[];
  callBacks: ((e: React.MouseEvent<HTMLImageElement>) => void)[];
  black?: boolean;
}

export default function MultiButton(props: Multibutton) {
  return (
    <div
      className={`relative border-[#dedddb] rounded-full items-center border-1 shadow-black shadow-2xs flex flex-row cursor-pointer overflow-clip ${props.black ? "bg-black border-0 shadow-none" : ""}`}
    >
      {props.imgURLS.map((e, i) => {
        return (
          <div
            key={i}
            className="hover:bg-[#DEDEDE] p-1 rounded-full duration-300 transition-colors flex items-center justify-center"
          >
            <img
              src={e}
              alt={props.imgAlts[i]}
              className="aspect-square min-w-[1vw]"
              onClick={props.callBacks[i]}
            />
          </div>
        );
      })}
    </div>
  );
}
