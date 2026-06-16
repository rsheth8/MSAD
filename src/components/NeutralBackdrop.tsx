"use client";

import dynamic from "next/dynamic";
import { AmbientOrbs } from "./AmbientOrbs";
import { BackdropShell } from "./BackdropShell";
import { BRAND } from "@/lib/brand";

const ContourScene = dynamic(() => import("./ContourScene"), { ssr: false });

/** Topographic contour backdrop tinted with the user accent — no sentiment data. */
export function NeutralBackdrop({ accent = BRAND.accent }: { accent?: string }) {
  return (
    <>
      <BackdropShell />
      <ContourScene accent={accent} neutral />
      <AmbientOrbs />
    </>
  );
}
