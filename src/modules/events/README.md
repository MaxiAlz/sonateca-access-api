# Módulo de Eventos y Códigos de Puerta (`events`)

> **Ecosistema:** SONATECA ACCESS  
> **Ubicación:** `sonateca-access-backend/src/modules/events`

---

## 1. Responsabilidad y Alcance

Este módulo gestiona la creación, edición, publicación y métricas de aforo en vivo de los eventos culturales. Adicionalmente, administra la creación y control de los **Códigos PIN de 6 dígitos (`door_codes`)** que permiten al personal de control ingresar en la app `sonateca-access-scanner`.

---

## 2. Reglas de Negocio Clave

* **Cartelera Pública:**
  * Accesible sin autenticación en `/api/v1/events/public` y `/api/v1/events/public/:slug`.
  * Solo lista eventos en estado `PUBLISHED`.
  * Soporta filtros por ciudad, rangos de fecha y búsqueda por texto.
* **Generación de Slug Único:**
  * Al crear un evento se genera un slug URL-friendly a partir del título (ej: `noche-sintetizadores-live-set-vol-4`). Si hay colisión, agrega un sufijo incremental.
* **Cupo Freemium por Persona:**
  * Al crearse, el evento recibe un cupo inicial por defecto (`ticketsQuota = 50`), configurable en `.env` (`DEFAULT_EVENT_QUOTA`).
* **PIN de Puerta Automático:**
  * Al crear el evento, se genera de manera automática el primer PIN de 6 dígitos para la puerta principal.
* **Métricas en Tiempo Real (`/events/:id/metrics`):**
  * Desglose instantáneo de:
    * Cupo total vs. ocupado por personas (`usedTicketsQuota`).
    * Invitados esperados vs. cancelados.
    * Personas actualmente adentro (`currentlyInsideGuests`), salidas temporales (`tempExitGuests`) y pendientes de llegar (`pendingArrivalGuests`).

---

## 3. Endpoints Disponibles

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/events/public` | Público | Listado paginado de eventos publicados |
| `GET` | `/api/v1/events/public/:slug` | Público | Detalle informativo para la cartelera |
| `GET` | `/api/v1/events` | Autenticado | Listado de eventos del productor (o todos si es `SUPERADMIN`) |
| `POST` | `/api/v1/events` | Autenticado | Crea evento (genera slug y PIN inicial) |
| `GET` | `/api/v1/events/:id` | Autenticado | Detalle completo del evento (incluye PINs de puerta) |
| `GET` | `/api/v1/events/:id/metrics` | Autenticado | Métricas de aforo y cupo en tiempo real |
| `PUT` | `/api/v1/events/:id` | Autenticado | Actualiza datos informativos |
| `PATCH` | `/api/v1/events/:id/status` | Autenticado | Cambia estado (`DRAFT`, `PUBLISHED`, `FINISHED`) |
| `GET` | `/api/v1/events/:id/door-codes` | Autenticado | Lista PINs de acceso para portería |
| `POST` | `/api/v1/events/:id/door-codes` | Autenticado | Crea un nuevo PIN de 6 dígitos |
| `PATCH` | `/api/v1/events/door-codes/:codeId/toggle` | Autenticado | Activa o desactiva un PIN |

---

## 4. Estructura de Archivos

```text
src/modules/events/
├── dto/
│   └── events.dto.ts          # CreateEventDto, UpdateEventDto, Filtros y CreateDoorCodeDto
├── events.controller.ts
├── events.service.ts
├── events.module.ts
└── README.md
```
