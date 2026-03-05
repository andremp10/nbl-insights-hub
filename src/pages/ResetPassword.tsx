import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const inputClass = "flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 pl-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsValid(true);
    } else {
      // Also check if user has an active session from recovery
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValid(true);
        } else {
          toast.error('Link de recuperação inválido ou expirado.');
          navigate('/auth');
        }
      });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha atualizada com sucesso!');
      navigate('/');
    }
  };

  if (!isValid) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 auth-grid-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <ShieldCheck className="text-primary-foreground h-6 w-6" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1 text-foreground">Redefinir Senha</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">Digite sua nova senha de acesso</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1">
              Nova Senha <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className={cn(inputClass, "pr-10")}
              />
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-foreground mb-1">
              Confirmar Senha <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmNewPassword"
                type={isPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                minLength={6}
                className={inputClass}
              />
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? "Atualizando..." : "Atualizar Senha"}
            </button>
          </motion.div>
        </form>

        <p className="text-xs text-muted-foreground/50 mt-8 text-center">
          NBL Gráfica — Painel Administrativo
        </p>
      </motion.div>
    </div>
  );
}
