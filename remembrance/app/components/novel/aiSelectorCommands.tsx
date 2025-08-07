import { CommandGroup, CommandItem, CommandSeparator } from "./ui/command";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  CheckCheck,
  RefreshCcwDot,
  WrapText,
} from "lucide-react";
import { useEditor } from "novel";

const options = [
  {
    value: "improve",
    label: "Improve writing",
    icon: RefreshCcwDot,
  },
  {
    value: "fix",
    label: "Fix grammar",
    icon: CheckCheck,
  },
  {
    value: "simple",
    label: "Make simple",
    icon: ArrowDownAZ,
  },
  {
    value: "shorter",
    label: "Make shorter",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "longer",
    label: "Make longer",
    icon: WrapText,
  },
];

interface AISelectorCommandsProps {
  onSelect: (value: string, option: string) => void;
}

const AISelectorCommands = ({ onSelect }: AISelectorCommandsProps) => {
  const { editor } = useEditor();

  return (
    <>
      <CommandGroup heading="Edit or review selection">
        {options.map((option) => (
          <CommandItem
            onClick={() => {
              if (!editor) return;
              const text = editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                ""
              );
              if (text.trim()) {
                // Create a proper prompt based on the option
                let prompt = "";
                switch (option.value) {
                  case "improve":
                    prompt = `Improve the writing of this text: "${text}"`;
                    break;
                  case "fix":
                    prompt = `Fix the grammar and spelling in this text: "${text}"`;
                    break;
                  case "simple":
                    prompt = `Make this text simpler and easier to understand: "${text}"`;
                    break;
                  case "shorter":
                    prompt = `Make this text shorter while keeping the main meaning: "${text}"`;
                    break;
                  case "longer":
                    prompt = `Expand this text with more details: "${text}"`;
                    break;
                  default:
                    prompt = text;
                }
                onSelect(prompt, option.value);
              }
            }}
            className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 rounded transition-colors"
            key={option.value}
          >
            <option.icon className="h-5 w-5 text-blue-500" />
            <span className="font-medium">{option.label}</span>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator className="border-t border-gray-200 my-1" />
    </>
  );
};

export default AISelectorCommands; 