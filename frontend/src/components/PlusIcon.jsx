import { PLUS_ICON } from "@/data/constants";

export const PlusIcon = ({ className = "h-4 w-4" }) => (
  <img src={PLUS_ICON} alt="PLUS" className={`inline-block object-contain ${className}`} draggable={false} />
);
