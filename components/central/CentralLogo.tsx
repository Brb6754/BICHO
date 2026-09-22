// bicho central's wordmark — Bruno's own file (public/logo-central.png,
// "Logo central blanco"): white letters with the electric indigo
// #3B00FF on the "i" slash and the "o" bug.
//
// Like BichoLogo, the file is a 1563×1563 canvas with the mark floating
// in a lot of empty space, so rendering it raw gives you a giant logo
// with huge invisible padding — which is exactly what went wrong the
// first time ("ese logo central gigante se ve horrible"). The crop is
// measured, not eyeballed: a pixel scan of the real file puts the
// mark's non-transparent bounding box at x 190–1472, y 466–945. Those
// four numbers drive the maths below, so the component's height class
// (h-7, h-8…) is the mark's real height, with no dead space around it.
//
// If the logo file is ever replaced, re-run the scan and update CROP.
const BOX = { x0: 190, y0: 466, x1: 1472, y1: 945, canvas: 1563 };

const CROP = {
  aspect: (BOX.x1 - BOX.x0) / (BOX.y1 - BOX.y0),
  widthPct: (BOX.canvas / (BOX.x1 - BOX.x0)) * 100,
  heightPct: (BOX.canvas / (BOX.y1 - BOX.y0)) * 100,
  leftPct: -(BOX.x0 / (BOX.x1 - BOX.x0)) * 100,
  topPct: -(BOX.y0 / (BOX.y1 - BOX.y0)) * 100,
};

// Sized by the caller's height class only (`h-7`, `h-9`…); width follows
// from the measured aspect ratio, so there's one asset at every size.
export function CentralLogo({ className = 'h-7' }: { className?: string }) {
  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{ aspectRatio: CROP.aspect }}
      role="img"
      aria-label="bicho"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- one static
          brand asset; next/image adds nothing at this size and the crop
          is done with CSS percentages against the raw file. */}
      <img
        src="/logo-central.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: `${CROP.widthPct}%`,
          height: `${CROP.heightPct}%`,
          left: `${CROP.leftPct}%`,
          top: `${CROP.topPct}%`,
          maxWidth: 'none',
        }}
      />
    </span>
  );
}
