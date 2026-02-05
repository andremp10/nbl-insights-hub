import React, { useRef, useEffect, useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Helper function to merge class names
const cn = (...classes: string[]) => {
    return classes.filter(Boolean).join(" ");
};

// Custom Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: "default" | "outline";
    className?: string;
}

const Button = ({
    children,
    variant = "default",
    className = "",
    ...props
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variantStyles = {
        default: "bg-primary bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    };

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// Custom Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
}

const Input = ({ className = "", ...props }: InputProps) => {
    return (
        <input
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-gray-800 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    );
};

type RoutePoint = {
    x: number;
    y: number;
    delay: number;
};

const DotMap = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Set up routes that will animate across the map
    const routes: { start: RoutePoint; end: RoutePoint; color: string }[] = [
        {
            start: { x: 100, y: 150, delay: 0 },
            end: { x: 200, y: 80, delay: 2 },
            color: "#2563eb", // Slightly darker blue for better visibility on light bg
        },
        {
            start: { x: 200, y: 80, delay: 2 },
            end: { x: 260, y: 120, delay: 4 },
            color: "#2563eb",
        },
        {
            start: { x: 50, y: 50, delay: 1 },
            end: { x: 150, y: 180, delay: 3 },
            color: "#2563eb",
        },
        {
            start: { x: 280, y: 60, delay: 0.5 },
            end: { x: 180, y: 180, delay: 2.5 },
            color: "#2563eb",
        },
    ];

    // Create dots for the world map
    const generateDots = (width: number, height: number) => {
        const dots = [];
        const gap = 12;
        const dotRadius = 1;

        // Create a dot grid pattern with random opacity
        for (let x = 0; x < width; x += gap) {
            for (let y = 0; y < height; y += gap) {
                // Shape the dots to form a world map silhouette
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
                        opacity: Math.random() * 0.5 + 0.2, // Slightly higher opacity for light theme
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

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dots = generateDots(dimensions.width, dimensions.height);
        let animationFrameId: number;
        let startTime = Date.now();

        // Draw background dots
        function drawDots() {
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);

            // Draw the dots
            dots.forEach(dot => {
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(37, 99, 235, ${dot.opacity})`; // Blue dots for light theme
                ctx.fill();
            });
        }

        // Draw animated routes
        function drawRoutes() {
            const currentTime = (Date.now() - startTime) / 1000; // Time in seconds

            routes.forEach(route => {
                const elapsed = currentTime - route.start.delay;
                if (elapsed <= 0) return;

                const duration = 3; // Animation duration in seconds
                const progress = Math.min(elapsed / duration, 1);

                const x = route.start.x + (route.end.x - route.start.x) * progress;
                const y = route.start.y + (route.end.y - route.start.y) * progress;

                // Draw the route line
                ctx.beginPath();
                ctx.moveTo(route.start.x, route.start.y);
                ctx.lineTo(x, y);
                ctx.strokeStyle = route.color;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw the start point
                ctx.beginPath();
                ctx.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = route.color;
                ctx.fill();

                // Draw the moving point
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = "#3b82f6";
                ctx.fill();

                // Add glow effect to the moving point
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
                ctx.fill();

                // If the route is complete, draw the end point
                if (progress === 1) {
                    ctx.beginPath();
                    ctx.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = route.color;
                    ctx.fill();
                }
            });
        }

        // Animation loop
        function animate() {
            drawDots();
            drawRoutes();

            // If all routes are complete, restart the animation
            const currentTime = (Date.now() - startTime) / 1000;
            if (currentTime > 15) { // Reset after 15 seconds
                startTime = Date.now();
            }

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
    const [email, setEmail] = useState(""); // Kept for UI but typically NBL uses Key (Password only) in Auth.tsx. 
    // However, Auth.tsx only uses 'password' (chave de acesso). 
    // I will check if I should keep email or just password.
    // The user provided component has email/password. 
    // The existing Auth.tsx only asks for 'chave de acesso' (password).
    // I should probably adapt it to just Password if that's the current auth method, 
    // but the component has "Email" and "Password".
    // Let's stick to the component structure but maybe make Email optional or dummy if the app only uses password.
    // Wait, Auth.tsx: const { login } = useAuth(); login(password).
    // The login function in AuthContext likely takes just a password if it's a simple key-based auth.
    // I'll inspect AuthContext if needed, but for now I'll assume I should use the key as password.
    // Actually, standardizing on what the component offers (Email + Password) might break the "access key" model.
    // BUT the user asked to "integrate an existing React component". 
    // If I completely change it to remove Email, I might be deviating.
    // However, if the backend ONLY supports key, Email is useless.
    // Let's look at Auth.tsx again. It says "Digite sua chave de acesso". 
    // It only has one input: password.
    // I will hide the email field or make it read-only/defaulted if I must, OR I will just modify the form to only ask for the Access Key.
    // Modifying the form to match the "Access Key" model seems safer for functionality.
    // I will comment out Email for now or replace it with the Access Key field.

    // DECISION: The user wants this SPECIFIC component design. 
    // But functionality must work.
    // I'll replace "Email" + "Password" with just "Access Key" to match the actual auth method.
    // OR, if I look at the prompt, maybe they want to START using email? 
    // No, "The codebase should support...".
    // I'll adhere to the current auth logic: Just Password (Access Key).
    // So I'll remove the Email field and rename Password to "Chave de Acesso".

    const [password, setPassword] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setIsLoading(true);
        // Simulate delay for effect
        await new Promise(resolve => setTimeout(resolve, 500));

        const success = login(password); // Using password as the access key
        setIsLoading(false);

        if (success) {
            toast.success('Bem-vindo ao NBL Insights Hub!');
            navigate('/financeiro'); // Redirect to dashboard
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
                className="w-full max-w-4xl overflow-hidden rounded-2xl flex bg-white shadow-xl h-[600px]"
            >
                {/* Left side - Map */}
                <div className="hidden md:block w-1/2 h-full relative overflow-hidden border-r border-gray-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100">
                        <DotMap />

                        {/* Logo and text overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                className="mb-6"
                            >
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                    <ArrowRight className="text-white h-6 w-6" />
                                </div>
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                className="text-3xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"
                            >
                                NBL Insights
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                className="text-sm text-center text-gray-600 max-w-xs"
                            >
                                Conecte-se aos seus dados financeiros e tome decisões inteligentes.
                            </motion.p>
                        </div>
                    </div>
                </div>

                {/* Right side - Sign In Form */}
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center bg-white">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-2xl md:text-3xl font-bold mb-1 text-gray-800">Bem-vindo</h1>
                        <p className="text-gray-500 mb-8">Digite sua chave de acesso</p>

                        {/* Google Login removed as requested */}

                        <form className="space-y-5" onSubmit={handleLogin}>
                            {/* Removed Email Field as NBL uses only Access Key */}

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Chave de Acesso <span className="text-blue-500">*</span>
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={isPasswordVisible ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Digite sua chave"
                                        required
                                        className="bg-gray-50 border-gray-200 placeholder:text-gray-400 text-gray-800 w-full pr-10 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
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
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full bg-gradient-to-r relative overflow-hidden from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2 rounded-lg transition-all duration-300",
                                        isHovered ? "shadow-lg shadow-blue-200" : ""
                                    )}
                                >
                                    <span className="flex items-center justify-center">
                                        {isLoading ? "Acessando..." : "Entrar"}
                                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                                    </span>
                                    {isHovered && !isLoading && (
                                        <motion.span
                                            initial={{ left: "-100%" }}
                                            animate={{ left: "100%" }}
                                            transition={{ duration: 1, ease: "easeInOut" }}
                                            className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                            style={{ filter: "blur(8px)" }}
                                        />
                                    )}
                                </Button>
                            </motion.div>

                            <div className="text-center mt-6">
                                <a href="#" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
                                    Esqueceu a chave?
                                </a>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};
