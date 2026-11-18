"use client";

import { loadFont } from "@remotion/google-fonts/Caveat";
import { useCurrentFrame } from "remotion";
import { DEFAULT_STEP, hashRange, qf, qstep } from "../stop-motion";

const { fontFamily: HAND_FAMILY } = loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "500", "600", "700"],
});

export interface HandwriteProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  perStep?: number;
  weight?: 400 | 500 | 600 | 700;
  align?: "left" | "center";
  fontFamily?: string;
  step?: number;
}

export function Handwrite({
  text,
  fontSize = 54,
  color = "#26242c",
  delay = 0,
  perStep = 1.6,
  weight = 600,
  align = "center",
  fontFamily = HAND_FAMILY,
  step = DEFAULT_STEP,
}: HandwriteProps) {
  const frame = useCurrentFrame();
  const steps = Math.max(0, qstep(Math.max(0, qf(frame, step) - delay), step));
  const shown = Math.floor(steps * perStep);
  const chars = Array.from(text);
  const freshFrom = shown - Math.ceil(perStep);

  // Quebra em linhas preservando o índice global do caractere, senão o "\n"
  // seria engolido pelos spans inline-block e tudo viraria uma linha só.
  const linhas: { char: string; i: number }[][] = [[]];
  chars.forEach((char, i) => {
    if (char === "\n") linhas.push([]);
    else linhas[linhas.length - 1].push({ char, i });
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      {linhas.map((linha, li) => (
        <div
          key={li}
          style={{
            fontFamily: `${fontFamily}, cursive`,
            fontWeight: weight,
            fontSize,
            lineHeight: 1.25,
            color,
            textAlign: align,
            minHeight: linha.length === 0 ? fontSize * 0.6 : undefined,
          }}
        >
          {linha.map(({ char, i }) => {
            const visible = i < shown;
            const slant = hashRange(`hw:${text}:${i}:r`, -3.2, 3.2);
            const dy = hashRange(`hw:${text}:${i}:y`, -1.8, 1.8);
            const fresh = visible && i >= freshFrom;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  opacity: visible ? 1 : 0,
                  translate: visible ? `0 ${dy}px` : undefined,
                  rotate: visible ? `${slant}deg` : undefined,
                  scale: visible ? `${fresh ? 1.06 : 1}` : undefined,
                }}
              >
                {char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
