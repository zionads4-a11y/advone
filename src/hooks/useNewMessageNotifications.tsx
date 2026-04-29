import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

interface NotificationContextType {
  unreadCount: number;
  clearUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Generate a short notification beep using Web Audio API
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First beep
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.frequency.value = 880;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.15);

    // Second beep (higher pitch, slight delay)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
    osc2.start(audioCtx.currentTime + 0.18);
    osc2.stop(audioCtx.currentTime + 0.35);

    // Cleanup
    setTimeout(() => audioCtx.close(), 500);
  } catch {
    // Silently fail if audio is not available
  }
}

export function NewMessageNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { companyIds, isClient, loading } = useUserCompanies();
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const hasInteractedRef = useRef(false);

  // Track user interaction for audio autoplay policy
  useEffect(() => {
    const handleInteraction = () => {
      hasInteractedRef.current = true;
    };
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // Clear unread when user navigates to conversations
  useEffect(() => {
    if (location.pathname === "/conversations") {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Subscribe to new incoming messages
  useEffect(() => {
    if (!user || loading) return;

    // For admin/member, listen to all companies; for clients, listen to their companies
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (isClient && companyIds.length > 0) {
      companyIds.forEach((companyId) => {
        const channel = supabase
          .channel(`notification-${companyId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "whatsapp_messages",
              filter: `company_id=eq.${companyId}`,
            },
            (payload) => {
              const msg = payload.new as { direction: string; sender_name: string | null; phone: string; message_text: string | null };
              if (msg.direction === "incoming") {
                handleNewMessage(msg);
              }
            }
          )
          .subscribe();
        channels.push(channel);
      });
    } else if (!isClient) {
      // Admin/member: listen to all messages
      const channel = supabase
        .channel("notification-all")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "whatsapp_messages",
          },
          (payload) => {
            const msg = payload.new as { direction: string; sender_name: string | null; phone: string; message_text: string | null };
            if (msg.direction === "incoming") {
              handleNewMessage(msg);
            }
          }
        )
        .subscribe();
      channels.push(channel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user, loading, isClient, companyIds]);

  const handleNewMessage = (msg: { sender_name: string | null; phone: string; message_text: string | null }) => {
    // 🚫 Ignora mensagens de operadoras / SMS broadcast / short codes
    const senderRaw = (msg.sender_name || "").toString().trim();
    const phoneDigits = (msg.phone || "").replace(/\D/g, "");
    const blockedSenders = [
      "tim", "tim brasil", "vivo", "claro", "oi", "nextel", "algar",
      "correios", "nubank", "itau", "bradesco", "santander", "caixa",
      "ifood", "mercado livre", "magalu", "americanas",
    ];
    const senderLower = senderRaw.toLowerCase();
    const isBlockedSender = blockedSenders.some((b) => senderLower.includes(b));
    // short code (menos de 8 dígitos) costuma ser SMS de operadora/empresa, não cliente
    const isShortCode = phoneDigits.length > 0 && phoneDigits.length < 8;
    if (isBlockedSender || isShortCode) return;

    // Increment unread count (only if not on conversations page)
    setUnreadCount((prev) => {
      if (window.location.pathname === "/conversations") return prev;
      return prev + 1;
    });

    // Play sound
    if (hasInteractedRef.current) {
      playNotificationSound();
    }

    // Show toast notification — garante string (evita [object Object])
    const senderName = senderRaw || msg.phone || "Nova mensagem";
    const rawText = msg.message_text;
    const text = typeof rawText === "string" && rawText.trim().length > 0
      ? rawText
      : "[mídia]";
    toast.info(`💬 ${senderName}`, {
      description: text.length > 60 ? text.slice(0, 60) + "…" : text,
      duration: 5000,
    });
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNewMessageNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNewMessageNotifications must be used within NewMessageNotificationProvider");
  }
  return context;
}
