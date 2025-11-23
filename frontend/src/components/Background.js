// import React, { useEffect, useRef } from "react";
// import { gsap } from "gsap";

// // Animated decorative background (subtle rotating earth + float)
// export default function Background() {
//   const wrapRef = useRef(null);
//   const globeRef = useRef(null);

//   useEffect(() => {
//     const wrap = wrapRef.current;
//     const globe = globeRef.current;
//     if (!wrap || !globe) return;

//     // slow continuous rotation for globe
//     gsap.to(globe, {
//       rotate: 360,
//       transformOrigin: "50% 50%",
//       repeat: -1,
//       ease: "linear",
//       duration: 80,
//     });

//     // subtle up/down floating motion for whole wrapper
//     gsap.to(wrap, {
//       y: 12,
//       repeat: -1,
//       yoyo: true,
//       ease: "sine.inOut",
//       duration: 6,
//     });

//     // entrance scale/opacity
//     gsap.fromTo(
//       wrap,
//       { autoAlpha: 0, scale: 0.96 },
//       { autoAlpha: 1, scale: 1, duration: 1.2, ease: "power2.out" }
//     );

//     return () => {
//       gsap.killTweensOf(globe);
//       gsap.killTweensOf(wrap);
//     };
//   }, []);

//   return (
//     <div
//       ref={wrapRef}
//       style={{
//         position: "fixed",
//         right: "6%",
//         top: "20%",
//         width: 420,
//         height: 420,
//         zIndex: 0,
//         pointerEvents: "none",
//         opacity: 0.95,
//         mixBlendMode: "multiply",
//       }}
//       aria-hidden
//     >
//       <svg
//         ref={globeRef}
//         viewBox="0 0 200 200"
//         width="100%"
//         height="100%"
//         style={{ display: "block" }}
//       >
//         <defs>
//           <radialGradient id="g1" cx="30%" cy="30%">
//             <stop offset="0%" stopColor="#bfe3b0" />
//             <stop offset="60%" stopColor="#8fbf88" />
//             <stop offset="100%" stopColor="#5f8b62" />
//           </radialGradient>
//           <radialGradient id="g2" cx="70%" cy="20%">
//             <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
//             <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
//           </radialGradient>
//           <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
//             <feGaussianBlur stdDeviation="6" />
//           </filter>
//         </defs>

//         {/* atmosphere glow */}
//         <circle cx="100" cy="100" r="96" fill="url(#g1)" />

//         {/* darker land patches (stylized continents) */}
//         <g fill="#3f6b4a" opacity="0.95">
//           <path d="M60 80c8-6 18-8 26-6s26 8 36 16 14 20 10 28-18 12-26 10-28-8-38-16-18-22-8-32z" />
//           <path d="M30 120c6-10 18-18 34-18s34 6 46 16 14 26 6 34-26 6-38 0-36-18-52-32z" />
//         </g>

//         {/* light sheen */}
//         <ellipse cx="125" cy="55" rx="45" ry="22" fill="url(#g2)" />

//         {/* soft cloud ring for depth */}
//         <g opacity="0.12" filter="url(#blur)" fill="#ffffff">
//           <ellipse cx="70" cy="40" rx="36" ry="10" />
//           <ellipse cx="150" cy="110" rx="30" ry="8" />
//         </g>

//         {/* rim/shadow */}
//         <circle cx="100" cy="100" r="98" fill="none" stroke="#2f4432" strokeOpacity="0.18" strokeWidth="4" />
//       </svg>
//     </div>
//   );
// }
