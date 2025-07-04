import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface ItemInfoSkeletonProps {
  className?: string;
}

export default function ItemInfoSkeleton({ className }: ItemInfoSkeletonProps) {
  return (
    <div className="@container h-full">
      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden border-white/10 bg-white/5",
          className,
        )}
      >
        <div className="absolute top-3 left-3 z-10">
          <Skeleton className="h-5 w-16 rounded-full bg-white/10" />
        </div>

        <div className="absolute top-3 right-3 z-10">
          <Skeleton className="h-5 w-12 rounded bg-white/10" />
        </div>

        <CardContent className="flex flex-1 flex-col space-y-4 p-4 @[20rem]:flex @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-4 @[20rem]:space-y-0">
          <div className="relative flex justify-center @[20rem]:flex-shrink-0 @[20rem]:justify-start">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <Skeleton className="h-16 w-16 bg-white/10" />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between space-y-2 @[20rem]:flex-1">
            <div className="text-center @[20rem]:text-left">
              <Skeleton className="mx-auto mb-2 h-4 w-32 bg-white/10 @[20rem]:mx-0" />
              <Skeleton className="mx-auto h-3 w-20 bg-white/10 @[20rem]:mx-0" />
            </div>

            <div className="flex flex-1 flex-col justify-end space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 bg-white/10" />
                <Skeleton className="h-4 w-16 bg-white/10" />
              </div>

              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 bg-white/10" />
                <Skeleton className="h-4 w-14 bg-white/10" />
              </div>

              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 bg-white/10" />
                <Skeleton className="h-4 w-12 bg-white/10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
