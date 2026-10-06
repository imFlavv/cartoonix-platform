import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { FileText, Megaphone, ScrollText } from "lucide-react";
import { WIKI_ARTICLES } from "../data/articles";
import { ANNOUNCEMENTS } from "../data/announcements";
import { UPDATES } from "../data/updates";
import { buildSearchIndex, searchWiki } from "../data/helpers";

const GROUP_ICON = { Articole: FileText, Anunțuri: Megaphone, "Note de Actualizare": ScrollText };

export const WikiSearch = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const index = useMemo(() => buildSearchIndex({ articles: WIKI_ARTICLES, announcements: ANNOUNCEMENTS, updates: UPDATES }), []);
  const results = useMemo(() => searchWiki(index, query), [index, query]);

  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((r) => {
      groups[r.group] = groups[r.group] || [];
      groups[r.group].push(r);
    });
    return groups;
  }, [results]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (url) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        data-testid="wiki-search-input"
        placeholder="Caută articole, recompense, NIX, anunțuri..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList data-testid="wiki-search-results">
        <CommandEmpty>Niciun rezultat găsit.</CommandEmpty>
        {Object.entries(grouped).map(([group, items]) => {
          const Icon = GROUP_ICON[group] || FileText;
          return (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => (
                <CommandItem key={item.url + item.title} onSelect={() => go(item.url)} data-testid={`wiki-search-result-${item.title}`}>
                  <Icon className="h-4 w-4 text-[#a855f7]" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
};
