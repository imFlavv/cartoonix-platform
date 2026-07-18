import { Smile } from "lucide-react";
import { EMOTICONS, emoticonUrl } from "@/data/emoticons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const EmojiPicker = ({ onSelect }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" data-testid="chat-emoji-btn" className="h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-[#ffcc00] transition-colors duration-200">
        <Smile className="h-5 w-5" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-[320px] p-3 bg-[#141414] border-white/10">
      <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-2">Emoticoane</p>
      <div className="grid grid-cols-7 gap-1.5 max-h-64 overflow-y-auto">
        {EMOTICONS.map((name) => (
          <button
            key={name}
            type="button"
            data-testid={`emoji-${name}`}
            onClick={() => onSelect(name)}
            title={name}
            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/10 transition-colors duration-200"
          >
            <img src={emoticonUrl(name)} alt={name} className="h-6 w-6" draggable={false} />
          </button>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);
