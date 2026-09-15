"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import type { MouseEvent } from "react";

export default function HeroParallax() {
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, {
    stiffness: 70,
    damping: 22,
    mass: 0.7,
  });

  const smoothY = useSpring(mouseY, {
    stiffness: 70,
    damping: 22,
    mass: 0.7,
  });

  // =========================================================
  // PARALLAX
  // =========================================================

  // Background circle
  const circleX = useTransform(smoothX, [-1, 1], [-3, 3]);
  const circleY = useTransform(smoothY, [-1, 1], [-3, 3]);

  // Main statue
  const statueX = useTransform(smoothX, [-1, 1], [-5, 5]);
  const statueY = useTransform(smoothY, [-1, 1], [-5, 5]);
  const statueRotate = useTransform(smoothX, [-1, 1], [-0.35, 0.35]);

  // Star
  const starX = useTransform(smoothX, [-1, 1], [-8, 8]);
  const starY = useTransform(smoothY, [-1, 1], [-6, 6]);
  const starRotate = useTransform(smoothX, [-1, 1], [-2, 2]);

  // Polaroid
  const polaroidX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const polaroidY = useTransform(smoothY, [-1, 1], [-10, 10]);
  const polaroidRotate = useTransform(
    smoothX,
    [-1, 1],
    [-1.5, 1.5]
  );

  // Black card
  const blackCardX = useTransform(smoothX, [-1, 1], [-14, 14]);
  const blackCardY = useTransform(smoothY, [-1, 1], [-10, 10]);
  const blackCardRotate = useTransform(
    smoothX,
    [-1, 1],
    [-2, 2]
  );

  // =========================================================
  // MOUSE HANDLERS
  // =========================================================

  function handleMouseMove(
    event: MouseEvent<HTMLDivElement>
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    const y =
      ((event.clientY - rect.top) / rect.height) * 2 - 1;

    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className="
        relative
        h-140
        w-full
        overflow-visible
      "
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* =====================================================
          LIME CIRCLE
      ===================================================== */}

      <motion.img
        src="/hero/circle.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="
          pointer-events-none
          absolute
          left-[16%]
          top-[7%]
          z-0
          w-125
          max-w-none
          select-none
        "
        style={{
          x: circleX,
          y: circleY,
        }}
      />

      {/* =====================================================
          STAR
      ===================================================== */}

      <motion.img
        src="/hero/star.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="
          pointer-events-none
          absolute
          right-[20%]
          top-[11%]
          z-10
          w-14.5
          select-none
        "
        style={{
          x: starX,
          y: starY,
          rotate: starRotate,
        }}
      />

      {/* =====================================================
          STATUE
      ===================================================== */}

      <motion.div
        className="
          pointer-events-none
          absolute
          -bottom-1.25
          left-1/2
          z-20
          w-190
          -translate-x-1/2
          select-none
        "
        style={{
          x: statueX,
          y: statueY,
          rotate: statueRotate,
        }}
      >
        <motion.img
          src="/hero/statue.webp"
          alt="Classical marble statue wearing neon green sunglasses and headphones"
          draggable={false}
          className="
            block
            h-auto
            w-full
            select-none
          "
          style={{
            userSelect: "none",
          }}
        />
      </motion.div>

      {/* =====================================================
          POLAROID
      ===================================================== */}

      <motion.img
        src="/hero/polaroid.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="
          pointer-events-none
          absolute
          right-[-2%]
          top-[17%]
          z-40
          w-45
          select-none
        "
        style={{
          x: polaroidX,
          y: polaroidY,
          rotate: polaroidRotate,
        }}
      />

      {/* =====================================================
          BLACK CARD
      ===================================================== */}

      <motion.img
        src="/hero/black_card.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="
          pointer-events-none
          absolute
          right-[-1%]
          top-[42%]
          z-50
          w-38.75
          select-none
        "
        style={{
          x: blackCardX,
          y: blackCardY,
          rotate: blackCardRotate,
        }}
      />
    </div>
  );
}