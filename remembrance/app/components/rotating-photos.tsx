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

// 3 rings — portrait photos, images repeat to fill each ring
const RINGS = [
  { count: 7, radius: 300, duration: 65,  w: 68,  h: 100, dir:  1 },
  { count: 8, radius: 510, duration: 95,  w: 76,  h: 112, dir: -1 },
  { count: 8, radius: 730, duration: 130, w: 84,  h: 124, dir:  1 },
];

export function RotatingPhotos() {
  let idx = 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* single centre anchor */}
      <div style={{ position: "absolute", top: "50%", left: "50%" }}>
        {RINGS.map((ring, ri) =>
          Array.from({ length: ring.count }).map((_, i) => {
            const photo = PHOTOS[idx++ % PHOTOS.length];
            // phase each photo evenly: negative delay = already N seconds in
            const delay = -(ring.duration / ring.count) * i;
            const spinName   = `spin-r${ri}`;
            const unspinName = `unspin-r${ri}`;

            return (
              <React.Fragment key={`r${ri}-i${i}`}>
                {/* arm: rotates around the centre anchor (transform-origin 0 0) */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: ring.radius,
                    height: 0,
                    transformOrigin: "0 0",
                    animation: `${spinName} ${ring.duration}s linear infinite`,
                    animationDirection: ring.dir === 1 ? "normal" : "reverse",
                    animationDelay: `${delay}s`,
                  }}
                >
                  {/* photo at tip of arm — counter-rotates to stay upright */}
                  <div
                    style={{
                      position: "absolute",
                      left: ring.radius - ring.w / 2,
                      top: -ring.h / 2,
                      width: ring.w,
                      height: ring.h,
                      animation: `${unspinName} ${ring.duration}s linear infinite`,
                      animationDirection: ring.dir === 1 ? "normal" : "reverse",
                      animationDelay: `${delay}s`,
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
        @keyframes spin-r0   { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes unspin-r0 { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes spin-r1   { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes unspin-r1 { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes spin-r2   { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes unspin-r2 { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
      `}</style>
    </div>
  );
}
