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
      src={
        "https://cdn.theorg.com/cf7d2f28-2d09-4a7b-b5ac-686f31eeb5ec_thumb.jpg"
      }
      height={40}
      width={40}
      className={`bg-gray-200 rounded-full text-white flex items-center justify-center w-10 h-10 text-lg font-semibold`}
      alt="Reteena Logo"
    />
  );
}
