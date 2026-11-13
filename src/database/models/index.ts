import { User } from './user.model';
import { Event } from './event.model';
import { Ticket } from './ticket.model';
import { TicketLog } from './ticket-log.model';
import { DoorCode } from './door-code.model';
import { QuotaRequest } from './quota-request.model';

export const DATABASE_MODELS = [
  User,
  Event,
  Ticket,
  TicketLog,
  DoorCode,
  QuotaRequest,
];

export { User, Event, Ticket, TicketLog, DoorCode, QuotaRequest };
