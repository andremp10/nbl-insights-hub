import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Star, Trash2, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatSession } from '@/hooks/useChatSessions';

interface Props {
  session: ChatSession;
  isActive: boolean;
  isPinned: boolean;
  query: string;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export const SessionItem = memo(function SessionItem({
  session, isActive, isPinned, query, onSelect, onRename, onDelete, onTogglePin,
}: Props) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const startRename = useCallback(() => {
    setValue(session.title || 'Nova conversa');
    setRenaming(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, [session.title]);

  const commit = useCallback(() => {
    const v = value.trim();
    if (v) onRename(v.slice(0, 60));
    setRenaming(false);
  }, [value, onRename]);

  useEffect(() => {
    if (isActive) itemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isActive]);

  const title = session.title || 'Nova conversa';
  const time = formatRelativeTime(session.last_message_at || session.created_at);

  return (
    <div ref={itemRef} className="relative group/item">
      {/* Active left bar */}
      {isActive && (
        <span aria-hidden className="session-active-bar absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
      )}

      {renaming ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/30">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setRenaming(false); }
            }}
            onBlur={commit}
            className="flex-1 min-w-0 bg-transparent text-[13px] text-foreground outline-none border-none"
            maxLength={60}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={startRename}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2 w-full pl-3 pr-1.5 py-2 rounded-lg text-left transition-colors duration-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            isActive
              ? 'bg-primary/12 text-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          )}
        >
          {isPinned && (
            <Pin className="w-3 h-3 shrink-0 text-primary fill-primary/40" />
          )}

          <span className={cn(
            'flex-1 truncate text-[13px]',
            isActive && 'font-medium'
          )}>
            {highlight(title, query)}
          </span>

          <span className={cn(
            'text-[10px] tabular-nums shrink-0 text-muted-foreground/50',
            'opacity-0 group-hover/item:opacity-100 transition-opacity',
            isActive && 'opacity-100 text-muted-foreground/70'
          )}>
            {time}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'p-1 -mr-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all',
                  'opacity-0 group-hover/item:opacity-100 focus:opacity-100',
                  isActive && 'opacity-100'
                )}
                aria-label="Mais ações"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startRename(); }}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(); }}>
                <Star className={cn('w-3.5 h-3.5 mr-2', isPinned && 'fill-primary text-primary')} />
                {isPinned ? 'Desfixar' : 'Fixar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
      )}
    </div>
  );
});
