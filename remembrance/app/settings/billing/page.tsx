"use client"
import SideBar from "@/app/components/sidebar"
import { useEffect, useRef, useState } from "react";
import { IBM, ManRope } from "@/app/lib/fonts";
import CircleButton from "@/app/components/circlebutton";
import OvalButton from "@/app/components/ovalbutton";
import "./billing.css"
export default function Billing(){

    const [timePeriod,setTimePeriod] = useState("Anually");
    
    
    return <div className={`${ManRope.className} w-screen flex flex-row bg-[##f9f8f6]`}>
     
        <SideBar selected={0}></SideBar>
     
        <div className="flex flex-col grow">
          <header className="px-5 bg-white">
            <div className="p-5 mt-5 ">
              <p className="text-[10px] text-black/50">Personal Settings</p>
              <h1 className=" text-[20px] font-semibold"> Welcome to Remembrance</h1>
            </div>
            <ul className="flex flex-wrap my-0 mx-5 -mb-px">
              <li className="me-2 py-0">
                  <a href="#" className="inline-block px-0 py-1 my-0 border-b-1 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 text-[10px] text-black/50 ">Personal Profile</a>
              </li>
              <li className="me-2 py-0">
                  <a href="#" className="inline-block px-0 py-1 my-0 text-[10px] text-black-600 border-b-1 border-black rounded-t-lg active " aria-current="page">Billing</a>
              </li>
              
          </ul>
            
           
            
          </header>
          <main className="flex-grow p-5 bg-[##F9F8F6]">
            <div className="m-5 w-full">
              <div className="px-1 py-1 my-10 grid grid-flow-col  bg-[#DDDBD9] inset-shadow-xs/10 w-30  align-middle text-center content-center rounded-3xl ">
                 <button  onClick={()=>setTimePeriod("Monthly")} className={`${timePeriod=="Monthly"?"shadow-sm/10 bg-white p-2": "hover:text-gray-500"} p-2 col-span-1 text-semibold text-[10px] rounded-3xl text-center content-center align-middle `}>Monthly</button>
                 <button onClick={()=>setTimePeriod("Anually")} className={`${timePeriod=="Anually"?"shadow-sm/10 bg-white p-2": "hover:text-gray-500"}  p-2  col-span-1 text-semibold text-[10px] rounded-3xl text-center content-center align-middle `}>Anually</button>
              </div>
              <div className="">
                <div className="flex max-w-3xl my-5  p-6 bg-white border align-middle border-black/15 rounded-md shadow-sm w-full gap-6">
             
                  <div className="flex flex-col justify-center w-1/3">
                    <p className="text-[10px] font-semibold">Free</p>
                    <p className={"text-[15px] my-1 font-medium " + IBM.className}>{(timePeriod=="Anually")? "$0/year" : "$0/month"}</p>
                    <p className="text-[10px] text-black/50 font-semibold">Starter plan for you to get a taste</p>
                  </div>

                
                  <div className="flex flex-col w-1/3  align-middle justify-center  align-text-middle">
                    <ul className="custom-list space-y-1">
                      <li className="text-[10px]">30 memory nodes per month</li>
                      <li className="text-[10px]">Unlimited Reminiscence Therapy</li>
                      <li className="text-[10px]">Community Support Only</li>
                    </ul>
                  </div>

            
                  <div className="flex flex-col justify-center items-end  w-1/3">
                    <button className="bg-black/15 rounded-md text-[7px] w-17 px-2 py-1">Current Plan</button>
                  </div>
                </div>
                <div className="flex max-w-3xl my-5 p-6 bg-white border align-middlerfdfcdr border-black/15 rounded-md shadow-sm w-full gap-6">
         
                  <div className="flex flex-col justify-center w-1/3">
                    <p className="text-[10px] font-semibold">Pro</p>
                    <p className={"text-[15px] my-1 font-medium " + IBM.className}>{(timePeriod=="Anually")? "$100/year" : "$15/month"}</p>
                    <p className="text-[10px] text-black/50 font-semibold">Latest models and custom prompts</p>
                  </div>

               
                  <div className="flex flex-col w-1/3  align-middle justify-center  align-text-middle">
                    <ul className="custom-list space-y-1">
                      <li className="text-[10px]">Unlimited memory nodes per month</li>
                      <li className="text-[10px]">Unlimited Reminiscence Therapy</li>
                      <li className="text-[10px]">Priority Support</li>
                    </ul>
                  </div>

                  <div className="flex flex-col justify-center items-end  w-1/3">
                    <button className="bg-black/15 rounded-md w-17 text-[7px] px-2 py-1">Upgrade</button>
                  </div>
                </div>
                <div className="flex max-w-3xl my-5 p-6 bg-white border align-middlerfdfcdr border-black/15 rounded-md shadow-sm w-full gap-6">
                
                  <div className="flex flex-col justify-center w-1/3">
                    <p className="text-[10px] font-semibold">Enterprise</p>
                    <p className={"text-[15px] my-1 font-medium " + IBM.className}>custom</p>
                    <p className="text-[10px] text-black/50 font-semibold">For clinics and caregivers</p>
                  </div>

          
                  <div className="flex flex-col w-1/3  align-middle justify-center  align-text-middle">
                    <ul className="custom-list space-y-1">
                      <li className="text-[10px]">Unlimited memory nodes per month</li>
                      <li className="text-[10px]">Unlimited Reminiscence Therapy</li>
                      <li className="text-[10px]">Custom Dashboard for tracking</li>
                    </ul>
                  </div>

             
                  <div className="flex flex-col justify-center items-end  w-1/3">
                    <button className="bg-black/15 rounded-md w-17 text-[7px] px-2 py-1">Contact</button>
                  </div>
                </div>
              </div>
            </div>
          </main>

        </div>
      </div>
}