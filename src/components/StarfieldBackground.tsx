import React, { useEffect, useRef } from "react";

interface StarfieldBackgroundProps {
  reducedMotion?: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

export const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({ reducedMotion = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    window.addEventListener("resize", handleResize);

    const stars: Star[] = [];
    const colors = ["#FFFFFF", "#E0F7FA", "#E1BEE7", "#FFF9C4", "#BBDEFB"];

    const initStars = () => {
      stars.length = 0;
      const count = Math.floor((width * height) / 3800);
      for (let i = 0; i < count; i++) {
        const baseAlpha = Math.random() * 0.7 + 0.2;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.6 + 0.4,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.03 + 0.008,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    initStars();

    const shootingStars: ShootingStar[] = [];
    const spawnShootingStar = () => {
      if (reducedMotion) return;
      if (shootingStars.length >= 2) return;
      shootingStars.push({
        x: Math.random() * width * 0.8 + width * 0.1,
        y: Math.random() * height * 0.3,
        length: Math.random() * 80 + 50,
        speed: Math.random() * 6 + 6,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        alpha: 1.0,
        active: true,
      });
    };

    let tick = 0;

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Space background gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.6,
        height * 0.4,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, "#081328");
      bgGrad.addColorStop(0.5, "#060D1E");
      bgGrad.addColorStop(1, "#030711");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant subtle nebula clouds
      const nebula1 = ctx.createRadialGradient(
        width * 0.2,
        height * 0.25,
        20,
        width * 0.2,
        height * 0.25,
        350
      );
      nebula1.addColorStop(0, "rgba(57, 139, 255, 0.04)");
      nebula1.addColorStop(0.5, "rgba(136, 101, 255, 0.02)");
      nebula1.addColorStop(1, "rgba(5, 11, 24, 0)");
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, width, height);

      const nebula2 = ctx.createRadialGradient(
        width * 0.85,
        height * 0.7,
        30,
        width * 0.85,
        height * 0.7,
        420
      );
      nebula2.addColorStop(0, "rgba(41, 217, 242, 0.035)");
      nebula2.addColorStop(0.6, "rgba(57, 139, 255, 0.015)");
      nebula2.addColorStop(1, "rgba(5, 11, 24, 0)");
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, width, height);

      // Render Stars with gentle twinkling
      tick += 0.02;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (!reducedMotion) {
          star.alpha = star.baseAlpha + Math.sin(tick * 2 + i) * 0.25;
          star.alpha = Math.max(0.1, Math.min(1.0, star.alpha));
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Spawn and render Shooting Stars
      if (!reducedMotion && Math.random() < 0.004) {
        spawnShootingStar();
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        if (!ss.active) {
          shootingStars.splice(i, 1);
          continue;
        }

        const endX = ss.x - Math.cos(ss.angle) * ss.length;
        const endY = ss.y - Math.sin(ss.angle) * ss.length;

        const ssGrad = ctx.createLinearGradient(ss.x, ss.y, endX, endY);
        ssGrad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha})`);
        ssGrad.addColorStop(0.4, `rgba(41, 217, 242, ${ss.alpha * 0.8})`);
        ssGrad.addColorStop(1, `rgba(57, 139, 255, 0)`);

        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = ssGrad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.alpha -= 0.015;

        if (ss.alpha <= 0 || ss.x > width || ss.y > height) {
          ss.active = false;
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};
