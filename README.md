# SONATECA ACCESS — Backend API

Backend centralizado para el ecosistema **SONATECA ACCESS**, desarrollado en **NestJS**, **Sequelize** y **PostgreSQL**, con documentación interactiva en **Swagger UI** y control de sesiones mediante **Cookies `httpOnly`**.

---

## 1. Arquitectura y Tecnologías

* **Framework:** NestJS 10 (TypeScript)
* **ORM:** Sequelize TypeScript (`sequelize-typescript`)
* **Base de Datos:** PostgreSQL local (`sonateca_access`, puerto `5432`)
* **Documentación:** Swagger / OpenAPI 3 (`/api/docs`)
* **Seguridad y Sesión:** Cookies `httpOnly` con JWT (`cookie-parser`) + `bcryptjs`
* **Contratos API:** Estandarización unificada `ApiResponse<T>` y `ApiPaginatedResponse<T>`

---

## 2. Mapa de Módulos del Backend

Cada módulo cuenta con su propio archivo `README.md` con detalles técnicos de su lógica, reglas y endpoints:

| Módulo | Ruta | Descripción |
| :--- | :--- | :--- |
| **`auth`** | [`src/modules/auth/README.md`](./src/modules/auth/README.md) | Registro de productores, login con cookie `httpOnly`, perfil y roles (`SUPERADMIN`, `PRODUCER`, `STAFF`) |
| **`events`** | [`src/modules/events/README.md`](./src/modules/events/README.md) | Cartelera pública, CRUD de eventos, métricas de aforo en vivo y generación de PINs de portería |
| **`tickets`** | [`src/modules/tickets/README.md`](./src/modules/tickets/README.md) | Emisión transaccional con descuento de cupo por persona, consulta de pase QR público y anulación |
| **`scanner`** | [`src/modules/scanner/README.md`](./src/modules/scanner/README.md) | Login por PIN de 6 dígitos, buscador rápido, control de ingreso grupal (`xN`), salida temporal y reingreso |
| **`credits`** | [`src/modules/credits/README.md`](./src/modules/credits/README.md) | Solicitud y acreditación de cupos adicionales Freemium por SuperAdmin |

---

## 3. Configuración Inicial y Puesta en Marcha

1. **Variables de Entorno (`.env`):**
   Asegúrate de tener configurado el archivo `.env` en la raíz del backend a partir
   del `.env.example`.
   
2. **Instalación y Ejecución:**
   ```powershell
   npm install
   npm run start:dev
   ```

3. **Swagger UI:**
   Ingresa en tu navegador a:
   👉 **`http://localhost:3000/api/docs`**

---

## 4. Política de Mantenimiento de Documentación

> **IMPORTANTE:** Siempre que se añada un nuevo endpoint, se modifique un modelo o cambie una regla de negocio en cualquiera de los módulos, **debe actualizarse el `README.md` del módulo correspondiente** y este `README.md` principal para mantener sincronizado el contexto del proyecto.
