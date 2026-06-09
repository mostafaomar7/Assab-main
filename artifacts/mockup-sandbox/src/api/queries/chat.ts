import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 2.1: Live support chat ────────────────────────────────────────

export interface ChatMessage {
  id: string;
  authorType: "user" | "agent";
  text: string;
  sentAt: string;
}

export interface ChatSessionStart {
  sessionId: string;
  agentName: string | null;
  queuePosition: number;
  estimatedWaitSeconds: number;
}

export interface ChatSession {
  sessionId: string;
  status: "queued" | "active" | "closed" | string;
  messages: ChatMessage[];
}

export function useStartChatSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ChatSessionStart>(
        "/company/me/support/chat/start",
      );
      return res.data;
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useChatSession(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ["support", "chat", sessionId] as const,
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const res = await api.get<ChatSession>(
        `/company/me/support/chat/${sessionId}`,
      );
      return res.data;
    },
    // Realtime via private-chat.session.{id} will invalidate; poll as fallback.
    refetchInterval: 15_000,
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      text,
    }: { sessionId: string; text: string }) => {
      const res = await api.post<{ id: string; sentAt: string }>(
        `/company/me/support/chat/${sessionId}/message`,
        { text },
      );
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["support", "chat", vars.sessionId] });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCloseChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post(`/company/me/support/chat/${sessionId}/close`);
    },
    onSuccess: (_data, sessionId) => {
      qc.invalidateQueries({ queryKey: ["support", "chat", sessionId] });
      toast.success("تم إغلاق المحادثة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
