import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const STYLE_ID = 'budgie-web-styles';

/** Scrollbar colors per theme: a thin thumb in the text color, no track. */
const SCROLLBAR = {
  light: { thumb: 'rgba(28, 28, 30, 0.22)', hover: 'rgba(28, 28, 30, 0.42)' },
  dark: { thumb: 'rgba(242, 242, 244, 0.22)', hover: 'rgba(242, 242, 244, 0.42)' },
} as const;

/** Global CSS of the web version (scrollbars), following the app theme. */
export function webStylesCss(scheme: 'light' | 'dark'): string {
  const { thumb, hover } = SCROLLBAR[scheme];
  return `
/* Chrome, Edge, Safari: thin rounded thumb, transparent border = space from the content */
::-webkit-scrollbar { width: 14px; height: 14px; }
::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: ${thumb};
  border-radius: 14px;
  border: 4px solid transparent;
  background-clip: content-box;
  min-height: 40px;
}
::-webkit-scrollbar-thumb:hover { background-color: ${hover}; border-width: 3px; }
/* Firefox (no ::-webkit-scrollbar): the standard properties */
@supports not selector(::-webkit-scrollbar) {
  * { scrollbar-width: thin; scrollbar-color: ${thumb} transparent; }
  *:hover { scrollbar-color: ${hover} transparent; }
}
`;
}

/** Injects the global web CSS and keeps it in sync with the theme (renders nothing). */
export function WebStyles() {
  const scheme = useColorScheme();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = webStylesCss(scheme);
  }, [scheme]);
  return null;
}
