"use client";
import { useEffect, useState } from "react";

interface ImageLightboxProps {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageLightbox({ photos, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex(i => Math.min(i + 1, photos.length - 1));
      if (e.key === "ArrowLeft") setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  if (!photos.length) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 20, right: 20, zIndex: 310,
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
          width: 40, height: 40, color: "#fff", fontSize: 18, cursor: "pointer",
        }}
      >✕</button>

      {photos.length > 1 && index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setIndex(i => i - 1); }}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 310, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer" }}
        >‹</button>
      )}
      {photos.length > 1 && index < photos.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setIndex(i => i + 1); }}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 310, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer" }}
        >›</button>
      )}

      <img
        src={photos[index]}
        onClick={e => e.stopPropagation()}
        alt=""
        style={{ maxWidth: "94%", maxHeight: "88dvh", objectFit: "contain", borderRadius: 8 }}
      />

      {photos.length > 1 && (
        <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {photos.map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i); }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: i === index ? "#D4AF37" : "rgba(255,255,255,0.35)", cursor: "pointer" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}