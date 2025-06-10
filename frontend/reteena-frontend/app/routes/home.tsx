import SideBar from "~/components/sidebar";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {


  return <div className = "w-screen flex flex-row bg-[##f9f8f6]">
    <SideBar selected = {1}></SideBar>
    <div className = " grow h-screen flex flex-col-reverse ">
      <div className = "mx-2 border-2 border-[#A3A3A3] rounded-3xl bg-white flex flex-col">
        <div className="w-full ">
          <textarea className = "w-full pt-5 px-2 " placeholder = "Illustrate your memories based on your people you love...">

          </textarea>
        </div>
        <div className="w-full flex flex-row justify-between items-end">
          <div className = "flex-row m-3">
            <div className="rounded-full drop-shadow-2xl border-[#e3e3e3]"><img  className = "w-[1.5vw]" src = "/paperclip.svg" alt = "files"></img></div>
            <div className="rounded-full"></div>
            <div className="rounded-full"></div>
          </div>
          <div className = "p-2 rounded-full bg-black m-3">
            <img src="/arrow-up.svg" className = "w-5 " alt="Send" />
          </div>
        </div>
      </div>
      <div className = "grow w-full">
      </div>
    </div>
  </div>
}
