// DriveTag-Logo – das Original-Bild aus public/.
//
// public/drivetag-logo.png  = Pin + Schriftzug (1099 x 319)
// public/drivetag-mark.png  = nur der Pin        (260 x 319)
//
// Beide haben einen durchsichtigen Hintergrund und funktionieren
// deshalb auf hellen und dunklen Flächen.

import Image from "next/image";

export const BRAND_GREEN = "#0FC36B";
export const BRAND_DARK = "#0C1722";

const LOGO_W = 1099;
const LOGO_H = 319;
const MARK_W = 260;
const MARK_H = 319;

/** Nur der Pin mit dem Auto */
export function LogoMark({
  height = 34,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src="/drivetag-mark.png"
      alt="DriveTag"
      width={Math.round((height * MARK_W) / MARK_H)}
      height={height}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}

/** Pin + Schriftzug "drivetag" */
export function LogoFull({
  height = 34,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src="/drivetag-logo.png"
      alt="DriveTag"
      width={Math.round((height * LOGO_W) / LOGO_H)}
      height={height}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}

type Props = {
  /** Höhe in Pixel */
  height?: number;
  /** true = Schriftzug auch auf schmalen Handys zeigen */
  alwaysFull?: boolean;
};

/**
 * Standard-Logo: auf dem Handy nur der Pin (spart Platz),
 * ab Tablet-Breite das ganze Logo mit Schriftzug.
 */
export default function Logo({ height = 34, alwaysFull = false }: Props) {
  if (alwaysFull) {
    return <LogoFull height={height} />;
  }

  return (
    <>
      <LogoMark height={height} className="sm:hidden" />
      <LogoFull height={height} className="hidden sm:block" />
    </>
  );
}
