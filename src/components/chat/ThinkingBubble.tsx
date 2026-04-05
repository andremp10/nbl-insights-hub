export function ThinkingBubble() {
  return (
    <div className="chat-msg-fade-in chat-msg-animate">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-foreground/70">Assistente NBL</span>
      </div>
      <div className="flex items-center gap-3 py-2">
        <div className="chat-shimmer-bar" />
        <span className="text-xs text-muted-foreground/60 whitespace-nowrap">Analisando…</span>
      </div>
    </div>
  );
}
