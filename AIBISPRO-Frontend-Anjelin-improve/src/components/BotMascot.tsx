/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, useAnimation } from "motion/react";

interface BotMascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Enables the idle float loop + a playful "tickle" wiggle on click. Used for the floating FAB. */
  interactive?: boolean;
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-16 h-16 sm:w-20 sm:h-20",
};

const TICKLE_KEYFRAMES = {
  rotate: [0, -12, 10, -8, 6, -3, 0],
  scale: [1, 1.12, 0.94, 1.08, 0.97, 1.03, 1],
};

/**
 * Pink messenger-bubble mascot (bear + bunny peeking over the top, heart accent) - no
 * background shape of its own, just the illustration, so it can float freely over any surface.
 */
export default function BotMascot({ size = "md", className = "", interactive = false, onClick }: BotMascotProps) {
  const controls = useAnimation();
  const [isTickled, setIsTickled] = useState(false);

  const handleClick = () => {
    if (interactive) {
      setIsTickled(true);
      controls.start({ ...TICKLE_KEYFRAMES, transition: { duration: 0.6, ease: "easeInOut" } }).then(() => setIsTickled(false));
    }
    onClick?.();
  };

  const svg = (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
      {/* Bear head (back, left) */}
      <g transform="translate(28,18)">
        <circle cx="0" cy="6" r="9" fill="#D9B48C" />
        <circle cx="-7" cy="-1" r="4" fill="#D9B48C" />
        <circle cx="7" cy="-1" r="4" fill="#D9B48C" />
        <circle cx="-3" cy="5" r="1.1" fill="#4A3324" />
        <circle cx="3" cy="5" r="1.1" fill="#4A3324" />
        <ellipse cx="0" cy="9" rx="1.6" ry="1" fill="#4A3324" opacity="0.7" />
      </g>

      {/* Bunny head (front, right, overlapping bear) */}
      <g transform="translate(46,14)">
        <ellipse cx="-6" cy="-9" rx="3.2" ry="7.5" fill="#FFFFFF" stroke="#F3D9E0" strokeWidth="0.6" transform="rotate(-12 -6 -9)" />
        <ellipse cx="6" cy="-9" rx="3.2" ry="7.5" fill="#FFFFFF" stroke="#F3D9E0" strokeWidth="0.6" transform="rotate(12 6 -9)" />
        <circle cx="0" cy="7" r="10" fill="#FFFFFF" stroke="#F3D9E0" strokeWidth="0.6" />
        <circle cx="-3.5" cy="6" r="1.2" fill="#3A2E2E" />
        <circle cx="3.5" cy="6" r="1.2" fill="#3A2E2E" />
        <ellipse cx="-5.5" cy="10" rx="2" ry="1.2" fill="#FFC9D8" opacity="0.8" />
        <ellipse cx="5.5" cy="10" rx="2" ry="1.2" fill="#FFC9D8" opacity="0.8" />
        <path d="M -1.3 9 Q 0 11 1.3 9" stroke="#3A2E2E" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </g>

      {/* Speech-bubble body */}
      <path
        d="M50 24c17.7 0 32 12.9 32 28.8 0 15.9-14.3 28.8-32 28.8-3.4 0-6.6-.5-9.7-1.3-4 3-8.7 5.3-13.8 6.5 1.7-3.4 2.8-7 3.2-10.8C24.5 70.4 18 62.5 18 52.8 18 36.9 32.3 24 50 24z"
        fill="#FF7FA6"
      />

      {/* Messenger-style lightning bolt */}
      <path
        d="M40 55.5 55 39l-3.8 13.5H62L45 70l3.6-14.5H40z"
        fill="#FFFFFF"
      />

      {/* Heart accent */}
      <path
        d="M79 79c-5-3.4-7.6-6.2-7.6-9.4a4.2 4.2 0 0 1 7.6-2.5 4.2 4.2 0 0 1 7.6 2.5c0 3.2-2.6 6-7.6 9.4z"
        fill="#FF5C87"
      />
    </svg>
  );

  if (!interactive) {
    return (
      <div className={`relative ${SIZE_MAP[size]} shrink-0 select-none transition-transform hover:scale-105 ${className}`}>
        {svg}
      </div>
    );
  }

  return (
    <motion.div
      className={`relative ${SIZE_MAP[size]} shrink-0 select-none cursor-pointer ${className}`}
      onClick={handleClick}
      animate={isTickled ? controls : { y: [0, -6, 0], rotate: [0, -3, 0, 3, 0] }}
      transition={isTickled ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      title="Tickle me!"
    >
      {svg}
    </motion.div>
  );
}
