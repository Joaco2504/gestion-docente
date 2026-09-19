import React from 'react';
import Login from './Login';

/**
 * AuthPage - Re-exporta la pantalla de Login oficial de Korum
 * Mantiene compatibilidad con imports existentes en rutas y componentes.
 */
export default function AuthPage() {
  return <Login />;
}

export { Login };
