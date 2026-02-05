import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Animated Dot Map Canvas Component
const DotMapCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Routes that animate across the map
  const routes = [
    { start: { x: 100, y: 150 }, end: { x: 200, y: 80 }, delay: 0 },
    { start: { x: 200, y: 80 }, end: { x: 260, y: 120 }, delay: 2 },
    { start: { x: 50, y: 50 }, end: { x: 150, y: 180 }, delay: 1 },
    { start: { x: 280, y: 60 }, end: { x: 180, y: 180 }, delay: 0.5 },
    { start: { x: 120, y: 200 }, end: { x: 220, y: 140 }, delay: 3 },
  ];

  // Generate dots for world map silhouette
  const generateDots = (width: number, height: number) => {
    const dots: { x: number; y: number; radius: number; opacity: number }[] = [];
    const gap = 12;
    const dotRadius = 1.2;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          // North America
          ((x < width * 0.25 && x > width * 0.05) && (y < height * 0.4 && y > height * 0.1)) ||
          // South America
          ((x < width * 0.25 && x > width * 0.15) && (y < height * 0.8 && y > height * 0.4)) ||
          // Europe
          ((x < width * 0.45 && x > width * 0.3) && (y < height * 0.35 && y > height * 0.15)) ||
          // Africa
          ((x < width * 0.5 && x > width * 0.35) && (y < height * 0.65 && y > height * 0.35)) ||
          // Asia
          ((x < width * 0.7 && x > width * 0.45) && (y < height * 0.5 && y > height * 0.1)) ||
          // Australia
          ((x < width * 0.8 && x > width * 0.65) && (y < height * 0.8 && y > height * 0.6));

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({
            x,
            y,
            radius: dotRadius,
            opacity: Math.random() * 0.4 + 0.2,
          });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas.parentElement as Element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;
    let startTime = Date.now();

    // Primary purple color #6C47FF = rgb(108, 71, 255)
    const primaryColor = { r: 108, g: 71, b: 255 };

    function drawDots() {
      ctx!.clearRect(0, 0, dimensions.width, dimensions.height);
      
      dots.forEach(dot => {
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${dot.opacity})`;
        ctx!.fill();
      });
    }

    function drawRoutes() {
      const currentTime = (Date.now() - startTime) / 1000;
      
      routes.forEach(route => {
        const elapsed = currentTime - route.delay;
        if (elapsed <= 0) return;
        
        const duration = 3;
        const progress = Math.min(elapsed / duration, 1);
        
        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;
        
        // Draw route line
        ctx!.beginPath();
        ctx!.moveTo(route.start.x, route.start.y);
        ctx!.lineTo(x, y);
        ctx!.strokeStyle = '#6C47FF';
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        
        // Start point
        ctx!.beginPath();
        ctx!.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = '#6C47FF';
        ctx!.fill();
        
        // Moving point with glow
        ctx!.beginPath();
        ctx!.arc(x, y, 6, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(108, 71, 255, 0.4)';
        ctx!.fill();
        
        ctx!.beginPath();
        ctx!.arc(x, y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = '#9B7DFF';
        ctx!.fill();
        
        // End point when complete
        if (progress === 1) {
          ctx!.beginPath();
          ctx!.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
          ctx!.fillStyle = '#6C47FF';
          ctx!.fill();
        }
      });
    }
    
    function animate() {
      drawDots();
      drawRoutes();
      
      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime > 12) {
        startTime = Date.now();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-background/60 to-indigo-950/80" />
    </div>
  );
};

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