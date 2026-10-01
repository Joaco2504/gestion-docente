import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} · Korum` : 'Korum · Gestión Académica';
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
