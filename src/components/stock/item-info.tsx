import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import Image from "next/image";
import { memo, useCallback } from "react";
import type { AttributedItem } from "~convex/types";
import AttributeRenderer from "../items/attribute-renderer";

interface ItemInfoProps {
  item: AttributedItem;
  className?: string;
  onSelect?: () => void;
}

const rarityColors = {
  Common: "bg-gray-500 text-white",
  Uncommon: "bg-green-500 text-white",
  Rare: "bg-blue-500 text-white",
  Epic: "bg-purple-500 text-white",
  Legendary: "bg-orange-500 text-white",
  Mythical: "bg-red-500 text-white",
  Divine: "bg-yellow-500 text-black",
  Prismatic: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  Limited: "bg-black text-white",
  "N/A": "bg-gray-400 text-white",
};

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

const ItemInfo = memo(function ItemInfo({
  item,
  className,
  onSelect,
}: ItemInfoProps) {
  const handleCardClick = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      target.src = "/images/placeholder-item?.attributes?.png";
    },
    [],
  );

  const rarity = item?.rarity;

  return (
    <div className="@container h-full">
      <Card
        className={cn(
          "group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-lg hover:shadow-[#2663ff]/10",
          className,
        )}
        onClick={handleCardClick}
      >
        <div className="absolute z-10 top-3 left-3">
          <Badge
            className={cn(
              "border-0 text-xs font-medium",
              rarityColors[rarity ?? "Common"],
            )}
          >
            {rarity}
          </Badge>
        </div>

        <div className="absolute z-10 top-3 right-3">
          <span className="px-2 py-1 text-xs rounded bg-black/20 text-white/50">
            {formatTimeAgo(item._creationTime)}
          </span>
        </div>

        <CardContent className="flex flex-1 flex-col space-y-4 p-4 @[20rem]:flex @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-4 @[20rem]:space-y-0">
          <div className="relative flex justify-center @[20rem]:flex-shrink-0 @[20rem]:justify-start">
            <div className="flex items-center justify-center w-20 h-20 overflow-hidden border rounded-lg border-white/10 bg-white/5">
              <Image
                src={item.thumbnailUrl}
                alt={item.name}
                width={64}
                height={64}
                className="object-contain w-16 h-16"
                onError={handleImageError}
                loading="lazy"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between space-y-2 @[20rem]:flex-1">
            <div className="text-center @[20rem]:text-left">
              <h3 className="text-sm font-semibold leading-tight text-white">
                {item.name}
              </h3>
              <p className="mt-1 text-xs text-white/60">{item.category}</p>
            </div>

            {!!item.sellValue && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Current Value</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-white">
                    ${item.sellValue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {item.attributes?.map((attribute, index) => (
                <AttributeRenderer 
                  key={index} 
                  attribute={attribute} 
                  variant="default" 
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default ItemInfo;
