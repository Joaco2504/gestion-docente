---
name: auth-rls-security
description: Manejo seguro de autenticación multi-docente, protección de rutas y validación de políticas Row Level Security (RLS).
triggers:
  - auth
  - login
  - registro
  - seguridad
  - rls
---

# Multi-Tenant Auth & Security Skill

## Directivas
1. **Autenticación**:
   - Pantalla de inicio de sesión y registro limpia con correo y contraseña.
   - Persistencia de sesión automática con Supabase Auth.
   - Rutas protegidas: Redirigir al login si el docente no tiene sesión activa.
2. **Aislamiento Multi-Docente**:
   - Garantizar que ninguna consulta o mutación consulte datos de otros docentes.
   - Confiar en las políticas Row Level Security (RLS) habilitadas en la base de datos para la capa de backend.
