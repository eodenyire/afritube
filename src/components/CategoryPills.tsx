import { useState } from "react";
import { motion } from "framer-motion";

interface CategoryPillsProps {
  categories: string[];
}

const CategoryPills = ({ categories }: CategoryPillsProps) => {
  const [active, setActive] = useState(categories[0]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setActive(cat)}
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
