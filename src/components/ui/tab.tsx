import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TabProps {
  text: string;
  selected: boolean;
  setSelected: (text: string) => void;
  discount?: boolean;
}

export const Tab = ({
  text,
  selected,
  setSelected,
  discount = false,
}: TabProps) => {
  return (
    <button
      onClick={() => setSelected(text)}
      className={cn(
        "relative w-fit px-4 py-2 text-sm font-semibold capitalize transition-colors",
        selected ? "text-black" : "text-black",
        discount && "flex items-center justify-center gap-2.5",
      )}
    >
      <span className="relative z-10" style={{ color: selected ? '#000000' : '#000000' }}>{text}</span>
      {selected && (
        <motion.span
          layoutId="tab"
          transition={{ type: "spring", duration: 0.4 }}
          className="absolute inset-0 z-0 rounded-full bg-white shadow-sm"
        ></motion.span>
      )}
      {discount && (
        <span
          className={cn(
            "relative z-10 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs text-black shadow-none",
            selected
              ? "bg-[#F3F4F6]"
              : "bg-gray-300",
          )}
        >
          Save 35%
        </span>
      )}
    </button>
  );
};

