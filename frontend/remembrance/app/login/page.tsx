import LoginButton from "../components/loginbutton";
import { poppins } from "../lib/fonts";


export default function Login() {


    return <div className="absolute left-0 top-0 w-screen h-screen flex flex-row overflow-hidden" >
        <div className="h-screen w-[70%] flex flex-col justify-center items-start pl-10  ">
            <div className="w-full p-5 absolute top-0"><img src="/r-logo.svg" alt="R" className="w-[3%]"></img> </div>
            <div className="w-[50%]  flex flex-col  px-6 gap-4   ">
                <h1 className={`w-full text-4xl ${poppins.className} `}>Welcome to Remembrance</h1>
                <div className={"w-full text-[#c0bebd] text-2xl " + poppins.className} >Ultimate tool to preserve dignity and <br></br>identity for those facing cognitive decline </div>
                <div className="w-full">Email</div>
                <input type="text" className="w-full bg-white p-2 shadow-lg shadow-neutral-200" id="username"></input>
                <div className="w-full">Password</div>
                <input type="password" className="w-full bg-white p-2 shadow-lg shadow-neutral-200" id="password"></input>
                <div id = "error" className = {`text-red-500 ` + poppins.className}></div>
                <div className="w-full flex flex-row  gap-5 items-center">
                    <LoginButton></LoginButton>
                    <div className="grid-rows-2 grid-cols-2 grid gap-2 ">
                        <div>Don’t have an account?</div>
                        <a className=" underline cursor-pointer">Sign Up Now</a>
                        <div >Forgot your password?</div>
                        <a className=" underline cursor-pointer">Reset</a>
                    </div>
                </div>
                <div className="w-full">Google sign in coming soon</div>
            </div>
            <div className="absolute bottom-5 left-10a text-[#a8a7a6]">© Reteena 2025. All Rights Reserved.</div>
        </div>
        <div className="h-full py-10 flex flex-row items-center justify-end"> <img src="/login.png" alt="Login" className = "h-[100%]" /></div>
    </div>
}