import { useState } from "react";
import { motion } from "framer-motion";

interface CategoryPillsProps {
  categories: string[];
  onSelect?: (category: string) => void;
}

const CategoryPills = ({ categories, onSelect }: CategoryPillsProps) => {
  const [active, setActive] = useState(categories[0]);

  const handleClick = (cat: string) => {
    setActive(cat);
    onSelect?.(cat);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className="relative px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors shrink-0"
        >
          {active === cat && (
            <motion.div
              layoutId="activePill"
              className="absolute inset-0 bg-gradient-gold rounded-full"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className={`relative z-10 ${active === cat ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {cat}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CategoryPills;
