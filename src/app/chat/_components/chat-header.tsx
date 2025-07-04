"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~convex/_generated/api";
import type { Id } from "~convex/_generated/dataModel";
import { MiddlemanTradeControls } from "./middleman-trade-controls";
import TradeInfoDialog from "~/components/trade/trade-info-dialog";

const statusConfig = {
  online: { color: "bg-green-500", label: "Online" },
  away: { color: "bg-yellow-500", label: "Away" },
  offline: { color: "bg-gray-500", label: "Offline" },
};

const tradeStatusConfig = {
  none: {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    label: "No Active Trade",
    icon: Clock
  },
  pending: { 
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
    label: "Pending Trade",
    icon: Clock 
  },
  accepted: { 
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30", 
    label: "Trade Accepted",
    icon: AlertCircle 
  },
  waiting_for_middleman: { 
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30", 
    label: "Middleman Called",
    icon: AlertCircle 
  },
  completed: { 
    color: "bg-green-500/20 text-green-400 border-green-500/30", 
    label: "Trade Complete",
    icon: CheckCircle2 
  },
  cancelled: { 
    color: "bg-red-500/20 text-red-400 border-red-500/30", 
    label: "Trade Cancelled",
    icon: CheckCircle2 
  },
};

function formatLastSeen(timestamp: number | null): { text: string; isOnline: boolean } {
  if (!timestamp) return { text: "Last seen unknown", isOnline: false };
  
  const now = Date.now();
  const diff = now - timestamp;
  
  // Consider user online if last seen within 60 seconds
  if (diff <= 60000) {
    return { text: "Online", isOnline: true };
  }
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return { text: `Last seen ${days}d ago`, isOnline: false };
  if (hours > 0) return { text: `Last seen ${hours}h ago`, isOnline: false };
  if (minutes > 0) return { text: `Last seen ${minutes}m ago`, isOnline: false };
  return { text: "Last seen just now", isOnline: false };
}

interface ChatHeaderProps {
  chatId: string;
  sessionId: Id<"session">;
  currentUserId: Id<"user">;
  isMiddleman: boolean;
  tradeStatus: string;
}

export function ChatHeader({ chatId, sessionId, currentUserId, isMiddleman, tradeStatus }: ChatHeaderProps) {
  const [tradeInfoDialogOpen, setTradeInfoDialogOpen] = useState(false);

  const chat = useQuery(api.chats.getChatById, {
    chatId: chatId as Id<"chats">,
    session: sessionId,
  });

  // Get the trade ad if this chat is associated with one
  const tradeAd = useQuery(api.tradeAds.getTradeAdById, 
    chat?.tradeAd ? { tradeAdId: chat.tradeAd } : "skip"
  );

  // Get the other participant (not the current user)
  const otherParticipant = chat?.participants.find(p => p && p._id !== currentUserId);
  
  const otherUserPresence = useQuery(api.user.getOtherUserPresence, 
    otherParticipant ? { userId: otherParticipant._id } : "skip"
  );
  
  if (chat === undefined) {
    return (
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }
  
  if (!chat) {
    return (
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="text-white/60">Chat not found</div>
      </div>
    );
  }

  if (!otherParticipant) {
    return (
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="text-white/60">Participant not found</div>
      </div>
    );
  }

  // Get presence status
  const presenceInfo = formatLastSeen(otherUserPresence ?? null);
  const statusInfo = presenceInfo.isOnline ? statusConfig.online : statusConfig.offline;
  const tradeInfo = tradeStatusConfig[tradeStatus as keyof typeof tradeStatusConfig] || tradeStatusConfig.none;
  const TradeIcon = tradeInfo.icon;

  return (
    <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="size-10 sm:size-12 ring-1 ring-white/20">
              <AvatarImage src={otherParticipant.robloxAvatarUrl ?? undefined} alt={otherParticipant?.name ?? "User"} />
              <AvatarFallback className="text-sm font-medium text-white bg-gradient-to-br from-purple-500 to-blue-500">
                {otherParticipant.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 size-3 sm:size-3.5 rounded-full border-2 border-white/20",
              statusInfo.color
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-base font-semibold text-white truncate sm:text-lg">
                {otherParticipant.name}
              </h1>
              {otherParticipant.robloxUsername && (
                <span className="text-sm opacity-80">@{otherParticipant.robloxUsername}</span>
              )}
            </div>
            
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-white/60">
                  {presenceInfo.text}
                </span>
              </div>
              
              <Badge 
                variant="outline" 
                className={cn("text-xs h-5 w-fit", tradeInfo.color)}
              >
                <TradeIcon className="size-2.5 mr-1" />
                {tradeInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {isMiddleman && (tradeStatus === "accepted" || tradeStatus === "waiting_for_middleman") && (
            <MiddlemanTradeControls chatId={chatId} sessionId={sessionId} />
          )}
          
          <div className="items-center hidden gap-1 sm:flex">
            {tradeAd && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 size-8"
                onClick={() => setTradeInfoDialogOpen(true)}
              >
                <Info className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {tradeAd && (
        <TradeInfoDialog
          tradeAd={tradeAd}
          open={tradeInfoDialogOpen}
          onOpenChange={setTradeInfoDialogOpen}
        />
      )}
    </div>
  );
}