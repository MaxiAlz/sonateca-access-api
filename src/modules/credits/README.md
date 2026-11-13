# Módulo de Créditos y Cupos Freemium (`credits`)

> **Ecosistema:** SONATECA ACCESS  
> **Ubicación:** `sonateca-access-backend/src/modules/credits`

---

## 1. Responsabilidad y Alcance

Este módulo implementa el modelo de cupos por evento y la monetización Freemium. Permite que los productores soliciten ampliar su límite de invitaciones para un evento y que el SuperAdmin apruebe, acredite `+N` lugares adicionales o rechace dichas solicitudes.

---

## 2. Reglas de Negocio Clave

* **Solicitudes de Ampliación (`POST /credits/request`):**
  * El productor solicita un paquete de lugares extra (`requestedGuests`, ej: 50, 100, 200).
  * La solicitud se crea con estado `PENDING`.
* **Acreditación Atómica por SuperAdmin (`POST /credits/admin/events/:eventId/add-quota`):**
  * El SuperAdmin suma directamente los lugares adicionales (`additionalGuests`) al `ticketsQuota` del evento.
  * Si existían solicitudes en estado `PENDING` para ese evento, las marca automáticamente como `APPROVED` y añade la nota de acreditación.
* **Rechazo de Solicitud (`PATCH /credits/admin/requests/:requestId/reject`):**
  * Permite al SuperAdmin pasar una solicitud a estado `REJECTED` indicando un motivo.

---

## 3. Endpoints Disponibles

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/credits/request` | Productor | Solicita ampliación de cupo de personas |
| `GET` | `/api/v1/credits/my-requests` | Productor | Lista las solicitudes del productor logueado |
| `GET` | `/api/v1/credits/admin/requests` | `SUPERADMIN` | Lista todas las solicitudes del sistema |
| `POST` | `/api/v1/credits/admin/events/:eventId/add-quota` | `SUPERADMIN` | Acredita cupo directo al evento (y auto-aprueba solicitudes) |
| `PATCH` | `/api/v1/credits/admin/requests/:requestId/reject` | `SUPERADMIN` | Rechaza una solicitud de cupo con motivo |

---

## 4. Estructura de Archivos

```text
src/modules/credits/
├── dto/
│   └── credits.dto.ts         # RequestQuotaDto, AddQuotaDto, QuotaRequestFilterQueryDto
├── credits.controller.ts
├── credits.service.ts
├── credits.module.ts
└── README.md
```
