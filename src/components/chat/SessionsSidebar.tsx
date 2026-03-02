import { useState, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, MessageSquare, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ChatSession } from '@/hooks/useChatSessions';

interface SessionsSidebarProps {
  groupedSessions: [string, ChatSession[]][];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  loading: boolean;
}

export function SessionsSidebar({
  groupedSessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  isOpen,
  onToggle,
  loading,
}: SessionsSidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = useCallback((session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameValue(session.title || 'Nova conversa');
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }, []);

  const commitRename = useCallback((id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed.length > 0) {
      onRenameSession(id, trimmed.slice(0, 60));
    }
    setRenamingId(null);
  }, [renameValue, onRenameSession]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'relative flex-shrink-0 border-r border-border bg-sidebar-background transition-all duration-200 overflow-hidden',
          isOpen ? 'w-[260px]' : 'w-0'
        )}
      >
        {isOpen && (
          <div className="flex flex-col h-full w-[260px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Conversas</span>
              <button
                onClick={onToggle}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Fechar sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New conversation button */}
            <div className="px-3 py-3">
              <button
                onClick={onCreateSession}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm',
                  'border border-dashed border-border text-muted-foreground',
                  'hover:border-primary/50 hover:text-foreground hover:bg-primary/5',
                  'transition-all duration-150'
                )}
              >
                <Plus className="w-4 h-4" />
                Nova conversa
              </button>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">Carregando...</div>
              ) : groupedSessions.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma conversa ainda</div>
              ) : (
                groupedSessions.map(([groupLabel, items]) => (
                  <div key={groupLabel} className="mb-3">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {groupLabel}
                    </div>
                    <AnimatePresence initial={false}>
                      {items.map((session) => {
                        const isActive = session.id === currentSessionId;
                        const isHovered = hoveredId === session.id;
                        const isRenaming = renamingId === session.id;

                        return (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            onMouseEnter={() => setHoveredId(session.id)}
                            onMouseLeave={() => {
                              setHoveredId(null);
                              if (confirmDeleteId === session.id) setConfirmDeleteId(null);
                            }}
                            className="relative mb-0.5"
                          >
                            {confirmDeleteId === session.id ? (
                              <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
                                <span className="text-xs text-destructive flex-1">Excluir?</span>
                                <button
                                  onClick={() => { onDeleteSession(session.id); setConfirmDeleteId(null); }}
                                  className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground"
                                >
                                  Não
                                </button>
                              </div>
                            ) : isRenaming ? (
                              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/30">
                                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-primary/50 ml-1" />
                                <input
                                  ref={renameInputRef}
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRename(session.id);
                                    if (e.key === 'Escape') cancelRename();
                                  }}
                                  onBlur={() => commitRename(session.id)}
                                  className="flex-1 min-w-0 bg-transparent text-[13px] text-foreground outline-none border-none"
                                  maxLength={60}
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => onSelectSession(session.id)}
                                onDoubleClick={(e) => startRename(session, e)}
                                className={cn(
                                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-all duration-100',
                                  isActive
                                    ? 'bg-primary/10 border-l-2 border-primary text-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                )}
                              >
                                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                                <span className="flex-1 truncate text-[13px]">
                                  {session.title || 'Nova conversa'}
                                </span>
                                {(isHovered || isActive) && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={(e) => startRename(session, e)}
                                      className="p-0.5 rounded text-muted-foreground/50 hover:text-primary transition-colors"
                                      aria-label="Renomear conversa"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id); }}
                                      className="p-0.5 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
                                      aria-label="Excluir conversa"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle button when closed */}
      {!isOpen && (
        <div className="flex-shrink-0 flex items-center">
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center justify-center w-6 h-12',
              'bg-card border border-border border-l-0 rounded-r-lg',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              'transition-colors'
            )}
            aria-label="Abrir sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
