import React from 'react';
import {
  Layers,
  Laptop,
  Smartphone,
  Headphones,
  Watch,
  Plane,
  Shirt,
  Sparkles,
  Tag,
} from 'lucide-react';
import { CategoryItem } from '@/services/telegramApi';

interface TelegramCategoryBarProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

export const TelegramCategoryBar: React.FC<TelegramCategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const getCategoryIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'laptops':
        return <Laptop className="w-3.5 h-3.5" />;
      case 'smartphones':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'audio':
        return <Headphones className="w-3.5 h-3.5" />;
      case 'smartwatches':
      case 'wearables':
        return <Watch className="w-3.5 h-3.5" />;
      case 'drones':
      case 'cameras':
        return <Plane className="w-3.5 h-3.5" />;
      case 'fashion':
      case 'apparel':
        return <Shirt className="w-3.5 h-3.5" />;
      default:
        return <Tag className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="py-2 overflow-x-auto no-scrollbar scroll-smooth">
      <div className="flex items-center space-x-2 px-4 min-w-max">
        {/* All Products Pill */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white shadow-xs scale-102'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Items</span>
        </button>

        {/* Dynamic Category Pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs scale-102'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {getCategoryIcon(cat.slug)}
              <span>{cat.name}</span>
              {cat.products_count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cat.products_count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

