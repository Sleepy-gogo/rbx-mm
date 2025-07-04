import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { type PublicUserProfile } from "./user";
import { getUser, requireAdmin } from "./utils/auth";
import { ROLES } from "./types";

// Type definitions for resolved middleman call data
export type ResolvedMiddlemanCall = Doc<"middleman_calls"> & {
  message?: Doc<"messages"> | null;
  chat?: Doc<"chats"> | null;
  creator?: PublicUserProfile | null;
};

// Validators
const middlemanCallStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("cancelled")
);

// --- Middleman Call Management ---

export const createMiddlemanCall = mutation({
  args: {
    chatId: v.id("chats"),
    reason: v.string(),
    estimatedWaitTime: v.string(),
    session: v.id("session"),
  },
  handler: async (ctx, { chatId, reason, estimatedWaitTime, session }): Promise<Id<"messages">> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to create middleman calls.");
    }

    const chat = await ctx.db.get(chatId);
    if (!chat) {
      throw new Error("Chat not found.");
    }

    if (!chat.participantIds.includes(user._id) && (!user.roles?.includes("middleman") && !user.roles?.includes("admin"))) {
      throw new Error("You are not a participant in this chat.");
    }

    if (reason.trim().length === 0) {
      throw new Error("Reason cannot be empty.");
    }

    if (reason.length > 500) {
      throw new Error("Reason cannot exceed 500 characters.");
    }

    if (estimatedWaitTime.trim().length === 0) {
      throw new Error("Estimated wait time cannot be empty.");
    }

    if (estimatedWaitTime.length > 100) {
      throw new Error("Estimated wait time cannot exceed 100 characters.");
    }

    // Check if there's already a pending middleman call in this chat
    const existingMessages = await ctx.db
      .query("messages")
      .withIndex("chatId", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("type"), "middleman_call"))
      .collect();

    for (const msg of existingMessages) {
      if (msg.middlemanCallId) {
        const existingCall = await ctx.db.get(msg.middlemanCallId);
        if (existingCall && existingCall.status === "pending") {
          throw new Error("There is already a pending middleman call in this chat.");
        }
      }
    }

    const now = Date.now();
    
    // Create the middleman call record
    const middlemanCallId = await ctx.db.insert("middleman_calls", {
      status: "pending",
      reason,
      estimatedWaitTime,
      createdAt: now,
      updatedAt: now,
    });

    // Create the message referencing the middleman call
    const messageId = await ctx.db.insert("messages", {
      chatId,
      senderId: user._id,
      type: "middleman_call",
      middlemanCallId,
      timestamp: now,
    });

    // Update chat status to waiting_for_middleman
    await ctx.db.patch(chatId, { 
      lastMessageAt: now,
      tradeStatus: "waiting_for_middleman",
    });

    return messageId;
  },
});

export const updateMiddlemanCallStatus = mutation({
  args: {
    middlemanCallId: v.id("middleman_calls"),
    status: middlemanCallStatusValidator,
    session: v.id("session"),
  },
  handler: async (ctx, { middlemanCallId, status, session }): Promise<{ success: boolean }> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to update middleman calls.");
    }

    const middlemanCall = await ctx.db.get(middlemanCallId);
    if (!middlemanCall) {
      throw new Error("Middleman call not found.");
    }

    // Find the message associated with this middleman call to check chat access
    const message = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("middlemanCallId"), middlemanCallId))
      .first();

    if (!message) {
      throw new Error("Associated message not found.");
    }

    const chat = await ctx.db.get(message.chatId);
    if (!chat?.participantIds.includes(user._id) && (!user.roles?.includes("middleman") && !user.roles?.includes("admin"))) {
      throw new Error("You do not have access to this middleman call.");
    }

    // Only allow certain status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["accepted", "declined", "cancelled"],
      accepted: ["cancelled"],
      declined: ["cancelled"],
      cancelled: [], // Cannot change from cancelled
    };

    if (!validTransitions[middlemanCall.status]?.includes(status)) {
      throw new Error(`Cannot change middleman call status from ${middlemanCall.status} to ${status}.`);
    }

    // Only the creator can cancel, only middlemen can accept/decline
    const isMiddleman = user.roles?.includes(ROLES.MIDDLEMAN) ?? user.roles?.includes(ROLES.ADMIN);
    
    if (status === "cancelled" && message.senderId !== user._id) {
      throw new Error("Only the creator can cancel a middleman call.");
    }

    if ((status === "accepted" || status === "declined") && !isMiddleman) {
      throw new Error("Only middlemen can accept or decline middleman calls.");
    }

    await ctx.db.patch(middlemanCallId, {
      status,
      updatedAt: Date.now(),
    });

    // Update chat status based on middleman call status
    if (status === "accepted") {
      // Keep the trade status as waiting_for_middleman when accepted
      // The middleman will use their controls to complete/cancel the trade
      await ctx.db.patch(message.chatId, {
        lastMessageAt: Date.now(),
      });
    } else if (status === "declined" || status === "cancelled") {
      // Reset to accepted status when middleman call is declined/cancelled
      await ctx.db.patch(message.chatId, {
        tradeStatus: "accepted",
        lastMessageAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getMiddlemanCallById = query({
  args: {
    middlemanCallId: v.id("middleman_calls"),
    session: v.id("session"),
  },
  handler: async (ctx, { middlemanCallId, session }): Promise<ResolvedMiddlemanCall | null> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman calls.");
    }

    const middlemanCall = await ctx.db.get(middlemanCallId);
    if (!middlemanCall) return null;

    // Verify user has access through the associated message/chat
    const message = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("middlemanCallId"), middlemanCallId))
      .first();

    if (!message) {
      throw new Error("Associated message not found.");
    }

    const chat = await ctx.db.get(message.chatId);
    if (!chat?.participantIds.includes(user._id) && (!user.roles?.includes("middleman") && !user.roles?.includes("admin"))) {
      throw new Error("You do not have access to this middleman call.");
    }

    return await resolveMiddlemanCallDetails(ctx, middlemanCall);
  },
});

export const getMiddlemanCallsForChat = query({
  args: {
    chatId: v.id("chats"),
    status: v.optional(middlemanCallStatusValidator),
    session: v.id("session"),
  },
  handler: async (ctx, { chatId, status, session }): Promise<ResolvedMiddlemanCall[]> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman calls.");
    }

    const chat = await ctx.db.get(chatId);
    if (!chat?.participantIds.includes(user._id) && (!user.roles?.includes("middleman") && !user.roles?.includes("admin"))) {
      throw new Error("You do not have access to this chat.");
    }

    // Get all messages with middleman calls for this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("chatId", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("type"), "middleman_call"))
      .order("desc")
      .collect();

    // Get the middleman calls
    const middlemanCallIds = messages
      .map(msg => msg.middlemanCallId)
      .filter((id): id is Id<"middleman_calls"> => id !== undefined);

    const middlemanCalls = await Promise.all(
      middlemanCallIds.map(id => ctx.db.get(id))
    );

    // Filter by status if provided
    let filteredCalls = middlemanCalls.filter((call): call is Doc<"middleman_calls"> => call !== null);
    if (status) {
      filteredCalls = filteredCalls.filter(call => call.status === status);
    }

    return Promise.all(filteredCalls.map(call => resolveMiddlemanCallDetails(ctx, call)));
  },
});

export const getAllPendingMiddlemanCalls = query({
  args: {
    session: v.id("session"),
  },
  handler: async (ctx, { session }): Promise<ResolvedMiddlemanCall[]> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman calls.");
    }

    // Only middlemen and admins can view all pending calls
    const isMiddleman = user.roles?.includes(ROLES.MIDDLEMAN) ?? user.roles?.includes(ROLES.ADMIN);
    if (!isMiddleman) {
      throw new Error("Only middlemen can view all pending middleman calls.");
    }

    // Get all middleman calls with pending status
    const pendingCalls = await ctx.db
      .query("middleman_calls")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();

    return Promise.all(pendingCalls.map(call => resolveMiddlemanCallDetails(ctx, call)));
  },
});

export const getUserMiddlemanCalls = query({
  args: {
    status: v.optional(middlemanCallStatusValidator),
    session: v.id("session"),
  },
  handler: async (ctx, { status, session }): Promise<ResolvedMiddlemanCall[]> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman calls.");
    }

    // Get all chats the user participates in
    const chats = await ctx.db
      .query("chats")
      .collect();
    
    const userChats = chats.filter(chat => chat.participantIds.includes(user._id));

    const chatIds = userChats.map(chat => chat._id);

    // Get all middleman call messages from these chats created by the user
    const messages = await ctx.db
      .query("messages")
      .withIndex("senderId", (q) => q.eq("senderId", user._id))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), "middleman_call"),
          q.or(...chatIds.map(id => q.eq(q.field("chatId"), id)))
        )
      )
      .order("desc")
      .collect();

    // Get the middleman calls
    const middlemanCallIds = messages
      .map(msg => msg.middlemanCallId)
      .filter((id): id is Id<"middleman_calls"> => id !== undefined);

    const middlemanCalls = await Promise.all(
      middlemanCallIds.map(id => ctx.db.get(id))
    );

    // Filter by status if provided
    let filteredCalls = middlemanCalls.filter((call): call is Doc<"middleman_calls"> => call !== null);
    if (status) {
      filteredCalls = filteredCalls.filter(call => call.status === status);
    }

    return Promise.all(filteredCalls.map(call => resolveMiddlemanCallDetails(ctx, call)));
  },
});

export const getMiddlemanCallStats = query({
  args: {
    userId: v.optional(v.id("user")),
    session: v.id("session"),
  },
  handler: async (ctx, { userId, session }) => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman call stats.");
    }

    const targetUserId = userId ?? user._id;

    // Get all chats the target user participates in
    const chats = await ctx.db
      .query("chats")
      .collect();
    
    const userChats = chats.filter(chat => chat.participantIds.includes(targetUserId));

    const chatIds = userChats.map(chat => chat._id);

    // Get all middleman call messages from these chats created by the target user
    const messages = await ctx.db
      .query("messages")
      .withIndex("senderId", (q) => q.eq("senderId", targetUserId))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), "middleman_call"),
          q.or(...chatIds.map(id => q.eq(q.field("chatId"), id)))
        )
      )
      .collect();

    // Get the middleman calls
    const middlemanCallIds = messages
      .map(msg => msg.middlemanCallId)
      .filter((id): id is Id<"middleman_calls"> => id !== undefined);

    const middlemanCalls = await Promise.all(
      middlemanCallIds.map(id => ctx.db.get(id))
    );

    const validCalls = middlemanCalls.filter((call): call is Doc<"middleman_calls"> => call !== null);

    const stats = {
      total: validCalls.length,
      pending: validCalls.filter(call => call.status === "pending").length,
      accepted: validCalls.filter(call => call.status === "accepted").length,
      declined: validCalls.filter(call => call.status === "declined").length,
      cancelled: validCalls.filter(call => call.status === "cancelled").length,
    };

    return stats;
  },
});

// Admin function to update any middleman call
export const adminUpdateMiddlemanCall = mutation({
  args: {
    middlemanCallId: v.id("middleman_calls"),
    status: middlemanCallStatusValidator,
    session: v.id("session"),
  },
  handler: async (ctx, { middlemanCallId, status, session }): Promise<{ success: boolean }> => {
    await requireAdmin(ctx, session);

    const middlemanCall = await ctx.db.get(middlemanCallId);
    if (!middlemanCall) {
      throw new Error("Middleman call not found.");
    }

    await ctx.db.patch(middlemanCallId, {
      status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Admin function to get all middleman calls with filtering and sorting
export const adminGetAllMiddlemanCalls = query({
  args: {
    status: v.optional(middlemanCallStatusValidator),
    sortBy: v.optional(v.union(
      v.literal("newest"),
      v.literal("oldest"),
      v.literal("priority")
    )),
    session: v.id("session"),
  },
  handler: async (ctx, { status, sortBy = "newest", session }): Promise<ResolvedMiddlemanCall[]> => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman calls.");
    }

    // Only middlemen and admins can view all calls
    const isMiddleman = user.roles?.includes(ROLES.MIDDLEMAN) ?? user.roles?.includes(ROLES.ADMIN);
    if (!isMiddleman) {
      throw new Error("Only middlemen and admins can view all middleman calls.");
    }

    // Get all middleman calls
    let query = ctx.db.query("middleman_calls");

    // Apply status filter
    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    // Apply sorting and collect
    let middlemanCalls: Doc<"middleman_calls">[];
    switch (sortBy) {
      case "oldest":
        middlemanCalls = await query.order("asc").collect();
        break;
      case "priority":
        // Priority: pending first, then accepted, then others
        middlemanCalls = await query.order("desc").collect();
        break;
      case "newest":
      default:
        middlemanCalls = await query.order("desc").collect();
        break;
    }

    // For priority sorting, we need to sort manually since we can't do complex sorting in Convex
    if (sortBy === "priority") {
      const statusPriority = { pending: 1, accepted: 2, declined: 3, cancelled: 4 };
      middlemanCalls.sort((a, b) => {
        const aPriority = statusPriority[a.status] || 5;
        const bPriority = statusPriority[b.status] || 5;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // If same priority, sort by creation time (newest first)
        return b.createdAt - a.createdAt;
      });
    }

    return Promise.all(middlemanCalls.map(call => resolveMiddlemanCallDetails(ctx, call)));
  },
});

// Admin function to get middleman call statistics
export const adminGetMiddlemanCallStats = query({
  args: {
    session: v.id("session"),
  },
  handler: async (ctx, { session }) => {
    const user = await getUser(ctx, session);
    if (!user) {
      throw new Error("You must be logged in to view middleman call stats.");
    }

    // Only middlemen and admins can view all stats
    const isMiddleman = user.roles?.includes(ROLES.MIDDLEMAN) ?? user.roles?.includes(ROLES.ADMIN);
    if (!isMiddleman) {
      throw new Error("Only middlemen and admins can view all middleman call stats.");
    }

    const allCalls = await ctx.db.query("middleman_calls").collect();

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: allCalls.length,
      pending: allCalls.filter(call => call.status === "pending").length,
      accepted: allCalls.filter(call => call.status === "accepted").length,
      declined: allCalls.filter(call => call.status === "declined").length,
      cancelled: allCalls.filter(call => call.status === "cancelled").length,
      todayCount: allCalls.filter(call => call.createdAt >= oneDayAgo).length,
      weekCount: allCalls.filter(call => call.createdAt >= oneWeekAgo).length,
      avgResponseTime: calculateAverageResponseTime(allCalls),
    };

    return stats;
  },
});

// Helper function to calculate average response time
function calculateAverageResponseTime(calls: Doc<"middleman_calls">[]): number {
  const respondedCalls = calls.filter(call => 
    call.status !== "pending" && call.updatedAt > call.createdAt
  );
  
  if (respondedCalls.length === 0) return 0;
  
  const totalResponseTime = respondedCalls.reduce((sum, call) => {
    return sum + (call.updatedAt - call.createdAt);
  }, 0);
  
  return Math.round(totalResponseTime / respondedCalls.length / (1000 * 60)); // Return in minutes
}

// --- Helper Functions ---

async function resolveMiddlemanCallDetails(
  ctx: QueryCtx,
  middlemanCall: Doc<"middleman_calls">,
): Promise<ResolvedMiddlemanCall> {
  // Find the associated message
  const message = await ctx.db
    .query("messages")
    .filter((q) => q.eq(q.field("middlemanCallId"), middlemanCall._id))
    .first();

  let chat: Doc<"chats"> | null = null;
  let creator: PublicUserProfile | null = null;

  if (message) {
    chat = await ctx.db.get(message.chatId);
    if (message.senderId) {
      creator = await ctx.runQuery(api.user.getPublicUserProfile, {
        userId: message.senderId,
      });
    }
  }

  return {
    ...middlemanCall,
    message,
    chat,
    creator,
  };
}