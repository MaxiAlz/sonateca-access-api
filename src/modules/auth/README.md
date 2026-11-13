# Módulo de Autenticación y Usuarios (`auth`)

> **Ecosistema:** SONATECA ACCESS  
> **Ubicación:** `sonateca-access-backend/src/modules/auth`

---

## 1. Responsabilidad y Alcance

Este módulo gestiona la identidad, el registro de productores, la autenticación de usuarios, la protección de rutas mediante JWT y la sesión segura basada en **Cookies `httpOnly`**. Además, contiene la gestión administrativa de usuarios y roles del sistema para el rol `SUPERADMIN`.

---

## 2. Estrategia de Autenticación y Seguridad

* **Sesión con Cookie `httpOnly`:**
  * Al hacer login (`POST /auth/login`) o registro (`POST /auth/register`), el servidor inyecta una cookie llamada `sonateca_access_token` (`httpOnly: true`, `sameSite: 'lax'`, `path: '/'`).
  * Los clientes Frontend (como `sonateca-access-web`) no requieren manipular tokens JWT en `localStorage`. Solamente necesitan enviar peticiones con `withCredentials: true`.
  * Como respaldo opcional (ej: para herramientas externas), la estrategia JWT también soporta el header `Authorization: Bearer <token>`.
* **Cierre de sesión seguro:**
  * El endpoint `POST /auth/logout` limpia la cookie en el navegador mediante `res.clearCookie()`.
* **Roles del Sistema:**
  * `SUPERADMIN`: Control total de eventos, créditos y administración de usuarios.
  * `PRODUCER`: Productor de eventos, creador de invitaciones y gestor de códigos de puerta.
  * `STAFF`: Operador auxiliar.

---

## 3. Endpoints Disponibles

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Público | Registra un nuevo Productor y setea cookie `httpOnly` |
| `POST` | `/api/v1/auth/login` | Público | Autentica por email/contraseña y setea cookie `httpOnly` |
| `GET` | `/api/v1/auth/me` | Autenticado | Devuelve el perfil y rol del usuario logueado |
| `POST` | `/api/v1/auth/logout` | Público | Limpia la cookie de sesión |
| `GET` | `/api/v1/auth/admin/users` | `SUPERADMIN` | Listado paginado de usuarios con filtros (`role`, `isActive`, `search`) |
| `POST` | `/api/v1/auth/admin/users` | `SUPERADMIN` | Creación de usuario asignándole rol explícito |
| `PATCH` | `/api/v1/auth/admin/users/:id/role` | `SUPERADMIN` | Actualización de rol y estado activo |

---

## 4. Estructura de Archivos

```text
src/modules/auth/
├── decorators/
│   └── auth.decorators.ts     # @CurrentUser(), @Roles()
├── dto/
│   └── auth.dto.ts            # Validaciones class-validator (Login, Register, Filtros paginados)
├── guards/
│   └── auth.guards.ts         # JwtAuthGuard, RolesGuard
├── strategies/
│   └── jwt.strategy.ts        # Extractor dual: Cookie httpOnly + Bearer header
├── auth.controller.ts
├── auth.service.ts
├── auth.module.ts
└── README.md
```
