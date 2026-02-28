"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedBackground({ className, children }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let connections: Connection[] = [];

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      pulseSpeed: number;
      pulsePhase: number;
    }

    interface Connection {
      from: number;
      to: number;
      opacity: number;
    }

    // Initialize particles
    const initParticles = () => {
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
      particles = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.3,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      // Create some fixed connections
      connections = [];
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          if (Math.random() < 0.1) {
            connections.push({ from: i, to: j, opacity: 0.15 });
          }
        }
      }
    };

    initParticles();

    let time = 0;

    const animate = () => {
      if (!ctx) return;
      time += 0.016;

      // Clear with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#0f172a"); // slate-900
      gradient.addColorStop(0.5, "#1e1b4b"); // indigo-950
      gradient.addColorStop(1, "#0c1222"); // darker blue

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      connections.forEach((conn) => {
        const p1 = particles[conn.from];
        const p2 = particles[conn.to];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const opacity = conn.opacity * (1 - dist / 150);
          ctx.strokeStyle = `rgba(100, 149, 237, ${opacity})`; // cornflower blue
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });

      // Update and draw particles
      particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Pulse effect
        const pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulsePhase) * 0.3 + 0.7;
        const currentOpacity = p.opacity * pulse;

        // Draw particle with glow
        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        glowGradient.addColorStop(0, `rgba(147, 197, 253, ${currentOpacity})`); // blue-300
        glowGradient.addColorStop(0.5, `rgba(99, 102, 241, ${currentOpacity * 0.5})`); // indigo-500
        glowGradient.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw some shooting stars occasionally
      if (Math.random() < 0.002) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height * 0.5;
        const length = 50 + Math.random() * 50;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;

        const shootingGradient = ctx.createLinearGradient(
          startX,
          startY,
          startX + Math.cos(angle) * length,
          startY + Math.sin(angle) * length
        );
        shootingGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
        shootingGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = shootingGradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
