import React, { useRef, useEffect, useState } from 'react';

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

export default DotMapCanvas;
