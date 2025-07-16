"use client";

import { useContext } from "react";
import { UserContext } from "./usercontext";
import { hedvig } from "../lib/fonts";
import Image from "next/image";
function getInitals(name: string): string {
  name = name.trim();
  let num = name.split(" ");

  let first = name.substring(0, 1);
  if (num.length == 1) {
    return first.toUpperCase();
  } else {
    return first + "" + name.substring(num[0].length + 1, num[0].length + 2);
  }
}

export function BotProfile(props: { name: string }) {
  // return (
  //   <div
  //     className={`bg-black rounded-full text-white flex items-center justify-center w-10 h-10 text-lg font-semibold`}
  //   >
  //     {"A"}
  //   </div>
  // );
  return (
    <Image
      src={"/Remembrance.png"}
      height={40}
      width={40}
      className={`bg-gray-200 rounded-full text-white flex items-center justify-center w-10 h-10 text-lg font-semibold`}
      alt="Reteena Logo"
    />
  );
}
