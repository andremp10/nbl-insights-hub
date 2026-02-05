import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { CommandPalette, nblCommands } from './CommandPalette';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading,
  placeholder = 'Pergunte sobre financeiro, pedidos...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 52,
    maxHeight: 160,
  });

  // Show command palette when typing /
  useEffect(() => {
    if (value.startsWith('/') && !value.includes(' ')) {
      setShowCommandPalette(true);
      const matchingIndex = nblCommands.findIndex((cmd) =>
        cmd.prefix.startsWith(value)
      );
      setActiveSuggestion(matchingIndex >= 0 ? matchingIndex : 0);
    } else {
      setShowCommandPalette(false);
      setActiveSuggestion(-1);
    }
  }, [value]);

  // Close palette on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector('[data-command-button]');
      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue('');
      adjustHeight(true);
    }
  };

  const selectCommand = (index: number) => {
    const cmd = nblCommands[index];
    setValue(cmd.prefix + ' ');
    setShowCommandPalette(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < nblCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : nblCommands.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          selectCommand(activeSuggestion);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className={cn(
            'relative rounded-2xl border bg-card/50 overflow-hidden transition-all',
            inputFocused
              ? 'border-primary/50 ring-2 ring-primary/20 shadow-lg shadow-primary/5'
              : 'border-border/50'
          )}
          animate={inputFocused ? { scale: 1.01 } : { scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Command Palette */}
          <div ref={commandPaletteRef} className="relative">
            <AnimatePresence>
              {showCommandPalette && (
                <CommandPalette
                  activeSuggestion={activeSuggestion}
                  onSelect={selectCommand}
                  inputValue={value}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent px-4 py-3.5 pr-24 text-sm font-medium',
              'text-white placeholder:text-white/40',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            style={{ minHeight: '52px' }}
          />

          {/* Action buttons */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <motion.button
              type="button"
              data-command-button
              onClick={() => setShowCommandPalette((prev) => !prev)}
              whileTap={{ scale: 0.94 }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showCommandPalette
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Command className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              whileHover={(!value.trim() || isLoading) ? {} : { scale: 1.02 }}
              whileTap={(!value.trim() || isLoading) ? {} : { scale: 0.98 }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                value.trim() && !isLoading
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </motion.div>

        <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
          Digite <kbd className="px-1 py-0.5 rounded bg-muted/50 text-[10px]">/</kbd> para comandos rápidos
        </p>
      </div>
    </div>
  );
}