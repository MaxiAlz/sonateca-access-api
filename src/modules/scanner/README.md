# Módulo de Portería y Control de Acceso (`scanner`)

> **Ecosistema:** SONATECA ACCESS  
> **Ubicación:** `sonateca-access-backend/src/modules/scanner`

---

## 1. Responsabilidad y Alcance

Este módulo provee la API consumida exclusivamente por la aplicación de portería (`sonateca-access-scanner`). Maneja la autenticación sin contraseña mediante un **PIN de 6 dígitos**, el buscador de tickets para puerta, el control de ingresos para tickets grupales (`xN`), salidas temporales y reingresos, y el registro rápido de ingresos en puerta.

---

## 2. Reglas de Negocio Clave

* **Autenticación por PIN (`POST /scanner/auth`):**
  * El portero no requiere cuenta de usuario ni email. Solo escribe el PIN del evento (ej: `849201`).
  * Emite un token JWT de sesión con `role: 'SCANNER'` y `eventId`.
* **Guard de Seguridad (`ScannerAuthGuard`):**
  * Protege todas las operaciones de portería asegurando que el PIN pertenezca al evento sobre el que se ejecutan las acciones.
* **Manejo del Ticket Grupal (`xN`):**
  * **Check-In (`POST /scanner/check-in`):** Admite `quantity` personas. Actualiza `checkedInCount` y `currentlyInside`.
    * Si ingresan todos: `checkInStatus = 'COMPLETED'`.
    * Si ingresa una parte: `checkInStatus = 'PARTIAL'`.
    * Imposible ingresar más personas del `totalGuests` del pase.
  * **Salida Temporal (`POST /scanner/temp-exit`):** Reduce `currentlyInside` respetando que no sea menor a 0.
  * **Reingreso (`POST /scanner/re-entry`):** Incrementa `currentlyInside` validando que `currentlyInside + quantity <= checkedInCount`.
* **Ingreso Directo en Puerta (`POST /scanner/door-entry`):**
  * Registra un ticket instantáneo con `originType: 'PUERTA'` y marca su ingreso de inmediato.
* **Auditoría Exhaustiva (`ticket_logs`):**
  * Cada acción (`CHECK_IN`, `TEMP_EXIT`, `RE_ENTRY`, `DOOR_ENTRY`) graba en `ticket_logs` la hora, cantidad y el PIN que autorizó el movimiento.

---

## 3. Endpoints Disponibles

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/scanner/auth` | Público | Autentica el PIN de 6 dígitos del evento |
| `GET` | `/api/v1/scanner/tickets` | Sesión Scanner | Buscador rápido en puerta por DNI, Nombre o Código |
| `POST` | `/api/v1/scanner/check-in` | Sesión Scanner | Registra ingreso de 1 a N personas del grupo |
| `POST` | `/api/v1/scanner/temp-exit` | Sesión Scanner | Registra salida temporal (-N adentro) |
| `POST` | `/api/v1/scanner/re-entry` | Sesión Scanner | Registra reingreso de quienes salieron temporalmente |
| `POST` | `/api/v1/scanner/door-entry` | Sesión Scanner | Registra ingreso directo en puerta |

---

## 4. Estructura de Archivos

```text
src/modules/scanner/
├── dto/
│   └── scanner.dto.ts         # CheckInActionDto, TempExitActionDto, ReEntryActionDto, DoorEntryDto
├── guards/
│   └── scanner.guard.ts       # ScannerAuthGuard y @CurrentScanner()
├── scanner.controller.ts
├── scanner.service.ts
├── scanner.module.ts
└── README.md
```
