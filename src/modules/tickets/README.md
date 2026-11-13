# Módulo de Invitaciones y Tickets Digitales (`tickets`)

> **Ecosistema:** SONATECA ACCESS  
> **Ubicación:** `sonateca-access-backend/src/modules/tickets`

---

## 1. Responsabilidad y Alcance

Este módulo gestiona la emisión de invitaciones digitales individuales y grupales (`xN`), el control estricto de cupo por persona, la anulación con restitución de cupo y la consulta pública del pase digital con código QR para el invitado.

---

## 2. Reglas de Negocio Clave

* **Emisión Transaccional Atómica:**
  * Al emitir (`POST /tickets`), se ejecuta un bloqueo de fila (`LOCK.UPDATE`) sobre el evento.
  * Valida: `usedTicketsQuota + totalGuests <= ticketsQuota`. Si supera el cupo, aborta atómicamente.
  * Genera el código único `SNT-XXXX` y descuenta `totalGuests` del cupo del evento.
* **Campos Obligatorios vs. Opcionales:**
  * Obligatorios: `eventId`, `guestName`, `guestDni`, `totalGuests` (`1..20`).
  * Opcionales: `guestPhone`, `referenceTag` (por defecto `'General'`), `notes`.
* **Anulación y Liberación de Cupo:**
  * Endpoint `PATCH /tickets/:id/cancel`.
  * Solo se permite anular si la invitación no fue utilizada en puerta (`checkedInCount === 0` y `currentlyInside === 0`).
  * Al anularse, **devuelve automáticamente los lugares al cupo del evento**: `usedTicketsQuota -= totalGuests`.
  * Graba el evento en `ticket_logs` con acción `CANCELLED`.
* **Consulta Pública del Ticket QR:**
  * Endpoint `GET /tickets/public/:code` accesible sin autenticación para el invitado desde su smartphone (`/t/:code`).

---

## 3. Endpoints Disponibles

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tickets/public/:code` | Público | Vista del pase digital QR para el invitado |
| `POST` | `/api/v1/tickets` | Autenticado | Emite invitación digital individual o grupal (xN) |
| `GET` | `/api/v1/tickets` | Autenticado | Listado paginado con filtros (`status`, `checkInStatus`, `referenceTag`, `search`) |
| `PATCH` | `/api/v1/tickets/:id/cancel` | Autenticado | Anula ticket y libera cupo en el evento |

---

## 4. Estructura de Archivos

```text
src/modules/tickets/
├── dto/
│   └── tickets.dto.ts         # EmitTicketDto, TicketFilterQueryDto
├── tickets.controller.ts
├── tickets.service.ts
├── tickets.module.ts
└── README.md
```
