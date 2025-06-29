import { Command, CommandParamater } from "./types";



class Bold implements Command {
    name = "Bold"
    summary = "Bold text"
    params = [{
       name: "Text",
    }]
    run(params: String[]): String {
        return "**" + params[0] + "**"
    }
}
class Italicize implements Command {
    name = "Italicize"
    summary = "Italicize text"
    params = [{
       name: "Text",
    }]
    run(params: String[]): String {
        return "*" + params[0] + "*"
    }
}

class Heading implements Command {
    name = "Heading"
    summary = "Create a Heading"
    params = [{
       name: "Text",
    }]
    run(params: String[]): String {
        return "#" + params[0] + "\n"
    }
}
//dont know of a better way to do this
export const All_Commands = [
    Bold,
    Italicize,
    Heading
]