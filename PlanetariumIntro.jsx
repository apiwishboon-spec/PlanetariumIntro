import React, { useEffect, useRef, useState } from "react";

const PlanetariumIntro = () => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const domeRadius = size * 0.48;

    let animationId;
    let startTime = null;

    // Easing
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    // Projection
    const project3D = (x, y, z, cameraZ) => {
      const relZ = z - cameraZ;
      if (relZ <= 0) return null;

      const scale = 500 / relZ;
      const sx = centerX + x * scale;
      const sy = centerY + y * scale;

      const dx = sx - centerX;
      const dy = sy - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > domeRadius) return null;

      return { x: sx, y: sy, scale, relZ, dist };
    };

    // Stars
    const stars = [];
    for (let i = 0; i < 2000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 4000;
      const distance = Math.random() * 1500 + 200;

      stars.push({
        x: Math.cos(angle) * distance,
        y: height,
        z: Math.random() * 6000 + 1000,
        size: Math.random() * 1.5 + 0.3,
        brightness: Math.random() * 0.6 + 0.4,
      });
    }

    const animate = (timestamp) => {
      if (!isPlaying) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, domeRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Click START", centerX, centerY);

        animationId = requestAnimationFrame(animate);
        return;
      }

      if (!startTime) startTime = timestamp;
      const t = (timestamp - startTime) / 1000;
      timeRef.current = t;

      // Update UI only every 0.1s
      if (Math.floor(t * 10) !== Math.floor(displayTime * 10)) {
        setDisplayTime(t);
      }

      if (t >= 60) {
        setIsPlaying(false);
        startTime = null;
        return;
      }

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      // ===== REAL CIRCULAR CROP =====
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, domeRadius, 0, Math.PI * 2);
      ctx.clip();

      // Camera timeline
      let cameraZ = 0;
      let cameraX = 0;
      let cameraY = 0;
      let starOpacity = 0;

      if (t < 10) {
        const p = easeOutCubic(t / 10);
        cameraZ = p * 3000;
        starOpacity = Math.min(t / 3, 1);
        cameraX = Math.sin(t * 0.5) * 120 * p;
        cameraY = Math.cos(t * 0.3) * 90 * p;
      } else if (t < 35) {
        const lt = t - 10;
        const p = easeInOutCubic(lt / 25);
        cameraZ = 3000 + p * 4500;
        starOpacity = 1;
        cameraX = Math.sin(lt * 0.4) * 350 * Math.sin(p * Math.PI);
        cameraY = Math.cos(lt * 0.3) * 280 * Math.sin(p * Math.PI);
      } else {
        const lt = t - 35;
        const p = easeOutCubic(Math.min(lt / 15, 1));
        cameraZ = 7500 + p * 800;
        starOpacity = 0.6;
        cameraX = Math.sin(lt * 0.2) * 60 * (1 - p);
      }

      // ===== RENDER STARS WITH PARALLAX =====
      stars.forEach((star) => {
        // Depth-based parallax (this is the magic)
        const depthFactor = 1 / (star.z * 0.001);

        const proj = project3D(
          star.x + cameraX * depthFactor,
          star.y + cameraY * depthFactor,
          star.z,
          cameraZ
        );
        if (!proj) return;

        // Distance fade (atmospheric perspective)
        const depthFade = Math.max(0, 1 - proj.relZ / 6000);
        const opacity =
          starOpacity * star.brightness * depthFade * Math.min(proj.scale, 1);

        if (opacity < 0.05) return;

        const s = star.size * proj.scale;

        const g = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, s * 2);
        g.addColorStop(0, `rgba(255,255,255,${opacity})`);
        g.addColorStop(1, "rgba(255,255,255,0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, s * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // Dome border
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, domeRadius, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />

      <div className="mt-6 flex gap-4 items-center bg-gray-900 px-6 py-3 rounded-full">
        <button
          onClick={() => setIsPlaying(true)}
          disabled={isPlaying}
          className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold"
        >
          {isPlaying ? "FLYING" : "START"}
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            setDisplayTime(0);
          }}
          className="px-6 py-2 bg-gray-700 text-white rounded-full font-bold"
        >
          RESET
        </button>

        <div className="text-white font-mono text-xl">
          {displayTime.toFixed(1)}s
        </div>
      </div>
    </div>
  );
};

export default PlanetariumIntro;
