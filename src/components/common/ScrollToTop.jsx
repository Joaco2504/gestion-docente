import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente que restablece automáticamente el scroll al inicio (top: 0)
 * tanto de la ventana global como del contenedor principal (<main>)
 * ante cada cambio de ruta o parámetros de búsqueda.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Scroll window
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });

    // 2. Scroll contenedor <main> de la aplicación
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
    }
  }, [pathname, search]);

  return null;
}
