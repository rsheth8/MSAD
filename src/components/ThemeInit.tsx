import { MSAD_STORAGE } from "@/lib/brand";

/**
 * Blocking script that applies saved theme + accent before React hydrates.
 * Prevents hydration mismatches on <html> when localStorage differs from SSR.
 */
export function ThemeInit() {
  const script = `(function(){try{var t=localStorage.getItem(${JSON.stringify(MSAD_STORAGE.theme)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;var a=localStorage.getItem(${JSON.stringify(MSAD_STORAGE.accent)});if(a)document.documentElement.style.setProperty("--accent",a);}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
