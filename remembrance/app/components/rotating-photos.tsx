"use client";
import React from "react";

const PHOTOS = [
  "/photos/rectangle1.webp",
  "/photos/rectangle2.webp",
  "/photos/rectangle3.webp",
  "/photos/rectangle4.webp",
  "/photos/rectangle5.webp",
  "/photos/rectangle6.webp",
  "/photos/rectangle7.webp",
  "/photos/rectangle8.webp",
  "/photos/rectangle10.webp",
  "/photos/rectangle11.webp",
  "/photos/rectangle12.webp",
  "/photos/rectangle13.webp",
  "/photos/rectangle14.webp",
  "/photos/rectangle15.webp",
];

// inner(4) + middle(5) + outer(5) = 14 photos
const RINGS = [
  { count: 4, radius: 200, duration: 60, w: 88,  h: 66  },
  { count: 5, radius: 330, duration: 85, w: 108, h: 80  },
  { count: 5, radius: 470, duration: 115, w: 128, h: 95 },
];

export function RotatingPhotos() {
  let idx = 0;
  const items: React.ReactNode[] = [];

  RINGS.forEach((ring, ri) => {
    const dir = ri % 2 === 0 ? 1 : -1; // alternate CW / CCW per ring
    for (let i = 0; i < ring.count; i++) {
      const photo = PHOTOS[idx++ % PHOTOS.length];
      const startDeg = (360 / ring.count) * i;
      // delay so items spread evenly along orbit from the start
      const delay = -(ring.duration / ring.count) * i;

      items.push(
        <div
          key={`r${ri}i${i}`}
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${startDeg}deg)`,
          }}
        >
          {/* arm stretches out to radius */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: ring.radius,
              height: 0,
              transformOrigin: "0 0",
              animation: `spin${ri} ${ring.duration}s linear infinite`,
              animationDelay: `${delay}s`,
              animationDirection: dir === 1 ? "normal" : "reverse",
            }}
          >
            {/* photo sits at the end of the arm, counter-rotates to stay upright */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: ring.w,
                height: ring.h,
                transform: `translateY(-50%)`,
                animation: `unspin${ri} ${ring.duration}s linear infinite`,
                animationDelay: `${delay}s`,
                animationDirection: dir === 1 ? "normal" : "reverse",
              }}
            >
              <img
                src={photo}
                alt=""
                width={ring.w}
                height={ring.h}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
                  display: "block",
                }}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      );
    }
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
        }}
      >
        {items}
      </div>
      <style>{`
        @keyframes spin0   { to { transform: rotate(360deg);  } }
        @keyframes unspin0 { to { transform: translateY(-50%) rotate(-360deg); } }
        @keyframes spin1   { to { transform: rotate(360deg);  } }
        @keyframes unspin1 { to { transform: translateY(-50%) rotate(-360deg); } }
        @keyframes spin2   { to { transform: rotate(360deg);  } }
        @keyframes unspin2 { to { transform: translateY(-50%) rotate(-360deg); } }
      `}</style>
    </div>
  );
}
