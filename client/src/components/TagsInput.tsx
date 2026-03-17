import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  normalize?: (value: string) => string;
};

export default function TagsInput({
  value,
  onChange,
  placeholder = "Type and press comma, space or enter",
  normalize = (v) => v.trim(),
}: Props) {
  const [input, setInput] = useState("");

  const addTags = (raw: string) => {
    const parts = raw
      .split(/[\s,\n\r\t,]+/)
      .map((x: string) => normalize(x))
      .filter(Boolean);

    if (!parts.length) return;

    const next = [...new Set([...value, ...parts])];
    onChange(next);
  };

  const addCurrentInput = () => {
    addTags(input);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      addCurrentInput();
    }

    if (e.key === "Backspace" && !input && value.length) {
      removeTag(value[value.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;

    if (/[\s,\n\r\t,]+/.test(pasted)) {
      e.preventDefault();
      addTags(pasted);
      setInput("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 gap-y-1 border rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-primary">
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
        >
          {tag}
          <button
            type="button"
            className="ml-1 text-red-400 hover:text-red-500 cursor-pointer"
            onClick={() => removeTag(tag)}
          >
            <X size={14} />
          </button>
        </span>
      ))}

      <Input
        className="flex-1 border-none outline-none focus-visible:ring-0 bg-transparent p-1 min-w-[140px]"
        value={input}
        onChange={(e: any) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addCurrentInput();
        }}
        onPaste={handlePaste}
        placeholder={placeholder}
      />
    </div>
  );
}
