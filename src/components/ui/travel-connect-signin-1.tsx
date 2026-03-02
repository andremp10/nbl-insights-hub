import React, { useRef, useEffect, useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

const DotMap = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const routes = [
        { start: { x: 100, y: 150, delay: 0 }, end: { x: 200, y: 80, delay: 2 }, color: "hsl(var(--primary))" },
        { start: { x: 200, y: 80, delay: 2 }, end: { x: 260, y: 120, delay: 4 }, color: "hsl(var(--primary))" },
        { start: { x: 50, y: 50, delay: 1 }, end: { x: 150, y: 180, delay: 3 }, color: "hsl(var(--primary))" },
        { start: { x: 280, y: 60, delay: 0.5 }, end: { x: 180, y: 180, delay: 2.5 }, color: "hsl(var(--primary))" },
    ];

    const generateDots = (width: number, height: number) => {
        const dots: { x: number; y: number; radius: number; opacity: number }[] = [];
        const gap = 12;
        for (let x = 0; x < width; x += gap) {
            for (let y = 0; y < height; y += gap) {
                const isInMapShape =
                    ((x < width * 0.25 && x > width * 0.05) && (y < height * 0.4 && y > height * 0.1)) ||
                    ((x < width * 0.25 && x > width * 0.15) && (y < height * 0.8 && y > height * 0.4)) ||
                    ((x < width * 0.45 && x > width * 0.3) && (y < height * 0.35 && y > height * 0.15)) ||
                    ((x < width * 0.5 && x > width * 0.35) && (y < height * 0.65 && y > height * 0.35)) ||
                    ((x < width * 0.7 && x > width * 0.45) && (y < height * 0.5 && y > height * 0.1)) ||
                    ((x < width * 0.8 && x > width * 0.65) && (y < height * 0.8 && y > height * 0.6));
                if (isInMapShape && Math.random() > 0.3) {
                    dots.push({ x, y, radius: 1, opacity: Math.random() * 0.4 + 0.1 });
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
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dots = generateDots(dimensions.width, dimensions.height);
        let animationFrameId: number;
        let startTime = Date.now();

        function drawDots() {
            ctx!.clearRect(0, 0, dimensions.width, dimensions.height);
            dots.forEach(dot => {
                ctx!.beginPath();
                ctx!.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
                ctx!.fillStyle = `rgba(232, 80, 26, ${dot.opacity})`;
                ctx!.fill();
            });
        }

        function drawRoutes() {
            const currentTime = (Date.now() - startTime) / 1000;
            routes.forEach(route => {
                const elapsed = currentTime - route.start.delay;
                if (elapsed <= 0) return;
                const progress = Math.min(elapsed / 3, 1);
                const x = route.start.x + (route.end.x - route.start.x) * progress;
                const y = route.start.y + (route.end.y - route.start.y) * progress;
                ctx!.beginPath();
                ctx!.moveTo(route.start.x, route.start.y);
                ctx!.lineTo(x, y);
                ctx!.strokeStyle = "rgba(232, 80, 26, 0.6)";
                ctx!.lineWidth = 1.5;
                ctx!.stroke();
                ctx!.beginPath();
                ctx!.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
                ctx!.fillStyle = "rgba(232, 80, 26, 0.8)";
                ctx!.fill();
                ctx!.beginPath();
                ctx!.arc(x, y, 3, 0, Math.PI * 2);
                ctx!.fillStyle = "rgba(232, 80, 26, 1)";
                ctx!.fill();
                ctx!.beginPath();
                ctx!.arc(x, y, 6, 0, Math.PI * 2);
                ctx!.fillStyle = "rgba(232, 80, 26, 0.3)";
                ctx!.fill();
                if (progress === 1) {
                    ctx!.beginPath();
                    ctx!.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
                    ctx!.fillStyle = "rgba(232, 80, 26, 0.8)";
                    ctx!.fill();
                }
            });
        }

        function animate() {
            drawDots();
            drawRoutes();
            const currentTime = (Date.now() - startTime) / 1000;
            if (currentTime > 15) startTime = Date.now();
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions]);

    return (
        <div className="relative w-full h-full overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>
    );
};

export const SignInCard = () => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [password, setPassword] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        const success = login(password);
        setIsLoading(false);
        if (success) {
            toast.success('Bem-vindo ao NBL Insights Hub!');
            navigate('/financeiro');
        } else {
            toast.error('Chave de acesso incorreta');
            setPassword('');
        }
    };

    return (
        <div className="flex w-full h-full items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-4xl overflow-hidden rounded-2xl flex bg-card border border-border shadow-2xl h-[600px]"
            >
                {/* Left side - Map */}
                <div className="hidden md:block w-1/2 h-full relative overflow-hidden border-r border-border">
                    <div className="absolute inset-0 bg-muted">
                        <DotMap />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                className="mb-6"
                            >
                                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                    <ArrowRight className="text-primary-foreground h-6 w-6" />
                                </div>
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                className="text-3xl font-bold mb-2 text-center text-primary"
                            >
                                NBL Insights
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                className="text-sm text-center text-muted-foreground max-w-xs"
                            >
                                Conecte-se aos seus dados financeiros e tome decisões inteligentes.
                            </motion.p>
                        </div>
                    </div>
                </div>

                {/* Right side - Sign In Form */}
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center bg-card">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-2xl md:text-3xl font-bold mb-1 text-foreground">Bem-vindo</h1>
                        <p className="text-muted-foreground mb-8">Digite sua chave de acesso</p>

                        <form className="space-y-5" onSubmit={handleLogin}>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                                    Chave de Acesso <span className="text-primary">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={isPasswordVisible ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Digite sua chave"
                                        required
                                        className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    >
                                        {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onHoverStart={() => setIsHovered(true)}
                                onHoverEnd={() => setIsHovered(false)}
                                className="pt-2"
                            >
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium transition-all duration-300 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
                                        isHovered ? "shadow-lg shadow-primary/30" : ""
                                    )}
                                >
                                    <span className="flex items-center justify-center">
                                        {isLoading ? "Acessando..." : "Entrar"}
                                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                                    </span>
                                </button>
                            </motion.div>
                        </form>

                        <p className="text-xs text-muted-foreground/50 mt-8 text-center">
                            NBL Gráfica — Painel Administrativo
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};
