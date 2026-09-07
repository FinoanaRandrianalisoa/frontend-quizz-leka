import { useState, useRef, useEffect } from "react";
import { Send, Smile, Users } from "lucide-react";
import { Avatar, AvatarFallback, Button, ScrollArea } from "../ui";
import { useAuth } from "../../lib/auth";
import { BACKEND_URL, GRAPHQL_URL, WS_URL } from '@/config/backend'

interface Message {
  id: number;
  from: "me" | "other" | "system";
  author?: string;
  text: string;
  time: string;
}

const initialMessages: Message[] = [];

interface ChatPanelProps {
  spectators?: number;
  className?: string;
  inputId?: string;
  matchId?: string | number | null;
  room?: "match" | "quizGlobal";
}

export default function ChatPanel({ spectators = 12, className = "", inputId, matchId = null, room = "match" }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  let nextId = useRef(messages.length + 1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const texte = input.trim();
    // send via websocket if available
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: "message", envoyeur: user?.pseudo ?? "spectateur", message: texte }));
      } catch {
        // fallback to local
        setMessages((m) => [
          ...m,
          {
            id: ++nextId.current,
            from: "me",
            text: texte,
            time: new Date().toLocaleTimeString("fr-MG", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } else {
      setMessages((m) => [
        ...m,
        {
          id: ++nextId.current,
          from: "me",
          text: texte,
          time: new Date().toLocaleTimeString("fr-MG", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
    setInput("");
  };

  useEffect(() => {
    if (matchId == null) return;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    const apiBase = GRAPHQL_URL;
    const apiRoot = BACKEND_URL;
    const wsBase = WS_URL;
    const path = room === "quizGlobal" ? "quiz-global" : "match";
    const url = `${wsBase}/ws/${path}/${String(matchId)}/?token=${encodeURIComponent(token ?? "")}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { type?: string; envoyeur?: string; message?: string };
        if (payload.type === "message") {
          const isMe = payload.envoyeur === (user?.pseudo ?? "");
          setMessages((m) => [
            ...m,
            {
              id: ++nextId.current,
              from: isMe ? "me" : "other",
              author: payload.envoyeur,
              text: payload.message ?? "",
              time: new Date().toLocaleTimeString("fr-MG", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch (err) {
        // ignore
      }
    };

    ws.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
    };
  }, [matchId, room]);

  return (
    <div className={`flex flex-col bg-white border-l border-[#D9D9D9] ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#D9D9D9] shrink-0">
        <Users size={16} className="text-[#A0A0A0]" />
        <span className="text-sm font-semibold text-[#2D3142]">Chat</span>
        <span className="ml-auto text-xs text-[#A0A0A0]">{spectators} spectateurs</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          {messages.map(msg => {
            if (msg.from === "system") {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-[10px] text-[#A0A0A0] bg-[#F5F5F5] px-2 py-0.5 rounded-full">{msg.text}</span>
                </div>
              );
            }
            const isMe = msg.from === "me";
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <Avatar size="sm">
                    <AvatarFallback>{msg.author?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="text-[10px] text-[#A0A0A0]">{msg.author}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug
                    ${isMe
                      ? "bg-[#FF6B35] text-white rounded-tr-sm"
                      : "bg-[#F5F5F5] text-[#2D3142] rounded-tl-sm"
                    }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-[#A0A0A0]">{msg.time}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#D9D9D9] flex items-center gap-2 shrink-0">
        <input
          id={inputId}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Message..."
          className="flex-1 text-sm bg-[#F5F5F5] rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-[#FF6B35]/30 placeholder:text-[#A0A0A0]"
        />
        <Button size="icon" onClick={send} aria-label="Envoyer" className="rounded-full shrink-0">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
