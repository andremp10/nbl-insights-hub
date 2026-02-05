import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import DotMapCanvas from '@/components/auth/DotMapCanvas';

export default function Auth() {
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const success = login(password);
    setIsLoading(false);

    if (success) {
      toast.success('Bem-vindo ao NBL Insights Hub!');
      navigate('/financeiro');
    } else {
      toast.error('Senha incorreta');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Animated Map */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <DotMapCanvas />

        {/* Logo and text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="mb-6 inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                <span className="text-primary-foreground font-bold text-2xl">N</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-3">
              NBL Insights Hub
            </h1>

            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Conectando dados para decisões inteligentes na sua gráfica
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-card">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mb-4 inline-flex items-center justify-center">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-xl">N</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">NBL Insights Hub</h1>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-muted-foreground text-sm">
                Digite sua senha para acessar o painel
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    autoFocus
                    className="w-full h-12 px-4 pr-12 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.div
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={!password.trim() || isLoading}
                  className="relative w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium overflow-hidden transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                    ) : (
                      <>
                        Entrar
                        <motion.span
                          animate={{ x: isHovered ? 5 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.span>
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            {/* Footer */}
            <p className="text-center text-muted-foreground text-xs pt-4">
              Gráfica NBL © {new Date().getFullYear()}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}