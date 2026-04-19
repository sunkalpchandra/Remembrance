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

// 3 rings — portrait photos (w < h), images repeat to fill each ring
const RINGS = [
  { count: 7, radius: 300, duration: 65,  w: 62,  h: 96,  dir:  1 },
  { count: 8, radius: 510, duration: 95,  w: 70,  h: 108, dir: -1 },
  { count: 8, radius: 730, duration: 130, w: 78,  h: 120, dir:  1 },
];

export function RotatingPhotos() {
  let idx = 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* white radial fade masking the centre */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 42% 38% at 50% 50%, white 30%, transparent 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "absolute", top: "50%", left: "50%" }}>
        {RINGS.map((ring, ri) =>
          Array.from({ length: ring.count }).map((_, i) => {
            const photo = PHOTOS[idx++ % PHOTOS.length];
            const delay = -(ring.duration / ring.count) * i;

            return (
              <React.Fragment key={`r${ri}-i${i}`}>
                {/* arm rotates around centre */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: ring.radius,
                    height: 0,
                    transformOrigin: "0 0",
                    animation: `spin-r${ri} ${ring.duration}s linear infinite`,
                    animationDirection: ring.dir === 1 ? "normal" : "reverse",
                    animationDelay: `${delay}s`,
                  }}
                >
                  {/*
                    Container is landscape (h×w) in layout so that after
                    rotate(90deg) it visually appears portrait (w×h).
                    The 90° CW rotation maps the photo's bottom (+y) to the
                    -x direction in arm space = always toward centre.
                    No counter-rotation: the photo rotates with the arm.
                  */}
                  <div
                    style={{
                      position: "absolute",
                      left: ring.radius - ring.h / 2,
                      top: -ring.w / 2,
                      width: ring.h,
                      height: ring.w,
                      transform: "rotate(90deg)",
                      transformOrigin: "center center",
                    }}
                  >
                    <img
                      src={photo}
                      alt=""
                      width={ring.h}
                      height={ring.w}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 6,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                        display: "block",
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes spin-r0 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-r1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-r2 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
