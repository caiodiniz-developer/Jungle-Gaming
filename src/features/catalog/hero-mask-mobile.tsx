/**
 * Fundo decorativo do banner mobile (mesmo desenho de
 * `assets/icons/hero-mask-mobile.svg`, exportado do Figma), como SVG embutido.
 *
 * Embutido, o enfeite não é mais uma imagem a decodificar no primeiro quadro e
 * deixa de concorrer com o conteúdo do banner como maior elemento da tela.
 */
export function HeroMaskMobile({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 366 190"
      fill="none"
      className={className}
    >
      <rect width="366" height="190" rx="30" fill="url(#hero-mask-base)" />
      <mask id="hero-mask-clip" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="366" height="190">
        <rect width="366" height="190" rx="30" fill="#EDEDED" />
      </mask>
      <g mask="url(#hero-mask-clip)">
        <circle cx="44" cy="93" r="124" fill="url(#hero-mask-circle-a)" />
        <circle cx="197" cy="114" r="124" fill="url(#hero-mask-circle-b)" />
      </g>
      <defs>
        <linearGradient id="hero-mask-base" x1="5" y1="0" x2="366" y2="183" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D28A4C" stopOpacity="0.2" />
          <stop offset="1" stopColor="#D28A4C" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="hero-mask-circle-a" x1="69" y1="-10" x2="139" y2="185" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD9A5F" stopOpacity="0.43" />
          <stop offset="1" stopColor="#D28A4C" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="hero-mask-circle-b" x1="222" y1="11" x2="292" y2="206" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD9A5F" stopOpacity="0.37" />
          <stop offset="1" stopColor="#D28A4C" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
