"use client";

import { memo } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { formatNumber } from "~/lib/format-number";
import { Package, AlertCircle, Sprout, Egg, Wrench, Calendar, Palette } from "lucide-react";
import Image from "next/image";
import type { Doc } from "~convex/_generated/dataModel";

interface StockGridProps {
  className?: string;
  stocks?: Doc<"stocks">[] | undefined;
}

interface StockItemProps {
  stock: Doc<"stocks">;
  className?: string;
}

// Color mapping for rarity-based styling
const COLOR_STYLES: Record<string, string> = {
  "red": "border-red-500/30 bg-red-500/10",
  "green": "border-green-500/30 bg-green-500/10",
  "blue": "border-blue-500/30 bg-blue-500/10",
  "yellow": "border-yellow-500/30 bg-yellow-500/10",
  "purple": "border-purple-500/30 bg-purple-500/10",
  "orange": "border-orange-500/30 bg-orange-500/10",
  "pink": "border-pink-500/30 bg-pink-500/10",
  "gray": "border-gray-500/30 bg-gray-500/10",
  "black": "border-gray-700/30 bg-gray-700/10",
  "white": "border-white/30 bg-white/10",
  "cyan": "border-cyan-500/30 bg-cyan-500/10",
  "teal": "border-teal-500/30 bg-teal-500/10",
  "brown": "border-amber-700/30 bg-amber-700/10",
  "indigo": "border-indigo-500/30 bg-indigo-500/10",
  "lime": "border-lime-500/30 bg-lime-500/10",
  "violet": "border-violet-500/30 bg-violet-500/10",
  "amber": "border-amber-500/30 bg-amber-500/10",
  "emerald": "border-emerald-500/30 bg-emerald-500/10",
};

const StockItem = memo(function StockItem({
  stock,
  className,
}: StockItemProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = "/images/placeholder-item.png";
  };

  const isOutOfStock = stock.quantityInStock === 0;
  const colorStyle = COLOR_STYLES[stock.color] ?? "border-white/10 bg-white/5";

  return (
    <Card
      className={cn(
        "@container h-full transition-all duration-200 hover:border-white/20",
        isOutOfStock && "opacity-60",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center gap-3 p-4 text-center @min-3xs:flex-row @min-3xs:text-left">
        <div className="relative flex-shrink-0">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border",
            colorStyle
          )}>
            {stock.thumbnailUrl ? (
              <Image
                src={stock.thumbnailUrl}
                alt={stock.title}
                width={12}
                height={12}
                className="h-10 w-10 object-contain"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <Package className="h-6 w-6 text-white/40" />
            )}
          </div>
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <span className="text-xs font-medium text-red-400">OUT</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {stock.title}
          </p>
          <p className="text-xs text-white/60">
            {stock.category}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-sm font-bold",
                isOutOfStock ? "text-red-400" : "text-white",
              )}
            >
              {formatNumber(stock.quantityInStock)}
            </span>
            <Package className="h-3 w-3 text-white/40" />
          </div>
          <p className="text-xs text-white/40">in stock</p>
        </div>
      </CardContent>
    </Card>
  );
});

const StockGridSkeleton = memo(function StockGridSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 5 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded bg-white/10" />
            <Skeleton className="h-6 w-20 bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="h-full">
                <CardContent className="flex items-center gap-3 p-4">
                  <Skeleton className="h-12 w-12 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 bg-white/10" />
                    <Skeleton className="h-3 w-16 bg-white/10" />
                  </div>
                  <div className="space-y-1 text-right">
                    <Skeleton className="ml-auto h-4 w-8 bg-white/10" />
                    <Skeleton className="ml-auto h-3 w-12 bg-white/10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  stocks: Doc<"stocks">[];
  className?: string;
}

const CategorySection = memo(function CategorySection({
  title,
  icon,
  stocks,
  className,
}: CategorySectionProps) {
  if (stocks.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <div className="flex h-6 w-6 items-center justify-center text-white/80">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="ml-auto text-sm text-white/60">
          {stocks.length} item{stocks.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stocks.map((stock) => (
          <StockItem key={stock._id} stock={stock} />
        ))}
      </div>
    </div>
  );
});

const StockGrid = function StockGrid({ className, stocks }: StockGridProps) {
  if (stocks === undefined) {
    return <StockGridSkeleton />;
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Package className="h-8 w-8 text-white/60" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white/80">
          No Stock Data
        </h3>
        <p className="max-w-md text-white/60">
          Stock information will appear here once items are added to your inventory
        </p>
      </div>
    );
  }

  // Separate items by category
  const inStockItems = stocks.filter((stock) => stock.quantityInStock > 0);
  const seedStock = inStockItems.filter((stock) => stock.category === "Crop");
  const eggStock = inStockItems.filter((stock) => stock.category === "Egg");
  const gearStock = inStockItems.filter((stock) => stock.category === "Gear");
  const eventStock = inStockItems.filter((stock) => stock.category === "Event");
  const cosmeticStock = inStockItems.filter((stock) => stock.category === "Cosmetic");

  const hasAnyStock = seedStock.length > 0 || eggStock.length > 0 || gearStock.length > 0 || eventStock.length > 0 || cosmeticStock.length > 0;

  if (!hasAnyStock) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Package className="h-8 w-8 text-white/60" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white/80">
          All Items Out of Stock
        </h3>
        <p className="max-w-md text-white/60">
          Restock your inventory to see items here
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      <CategorySection
        title="Seeds"
        icon={<Sprout className="h-5 w-5" />}
        stocks={seedStock}
      />
      
      <CategorySection
        title="Eggs"
        icon={<Egg className="h-5 w-5" />}
        stocks={eggStock}
      />
      
      <CategorySection
        title="Gear"
        icon={<Wrench className="h-5 w-5" />}
        stocks={gearStock}
      />

      <CategorySection
        title="Events"
        icon={<Calendar className="h-5 w-5" />}
        stocks={eventStock}
      />

      <CategorySection
        title="Cosmetics"
        icon={<Palette className="h-5 w-5" />}
        stocks={cosmeticStock}
      />
    </div>
  );
};

export default StockGrid;