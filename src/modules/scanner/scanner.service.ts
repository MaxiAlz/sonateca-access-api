import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { DoorCode, Event, Ticket, TicketLog } from '../../database/models';
import {
  CheckInActionDto,
  DoorEntryDto,
  ReEntryActionDto,
  ScannerLoginDto,
  ScannerTicketQueryDto,
  TempExitActionDto,
} from './dto/scanner.dto';

export interface ScannerSession {
  doorCodeId: string;
  eventId: string;
  pinCode: string;
  label: string;
  role: 'SCANNER';
}

@Injectable()
export class ScannerService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(DoorCode) private readonly doorCodeModel: typeof DoorCode,
    @InjectModel(Event) private readonly eventModel: typeof Event,
    @InjectModel(Ticket) private readonly ticketModel: typeof Ticket,
    @InjectModel(TicketLog) private readonly ticketLogModel: typeof TicketLog,
    private readonly jwtService: JwtService,
  ) {}

  // =========================================================
  // 1. AUTENTICACIÓN POR PIN DE 6 DÍGITOS
  // =========================================================

  async authenticatePin(dto: ScannerLoginDto) {
    const pin = dto.pinCode.trim();
    const doorCode = await this.doorCodeModel.findOne({
      where: {
        pinCode: pin,
        isActive: true,
      },
      include: [
        {
          model: Event,
          attributes: [
            'id',
            'title',
            'venueName',
            'city',
            'eventDate',
            'status',
            'ticketsQuota',
            'usedTicketsQuota',
          ],
        },
      ],
    });

    if (!doorCode || !doorCode.event) {
      throw new UnauthorizedException('PIN_INVALIDO_O_INACTIVO');
    }

    if (doorCode.expiresAt && new Date(doorCode.expiresAt) < new Date()) {
      throw new UnauthorizedException('PIN_EXPIRADO');
    }

    const payload: ScannerSession = {
      doorCodeId: doorCode.id,
      eventId: doorCode.eventId,
      pinCode: doorCode.pinCode,
      label: doorCode.label,
      role: 'SCANNER',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      event: doorCode.event,
      doorCode: {
        id: doorCode.id,
        label: doorCode.label,
        pinCode: doorCode.pinCode,
      },
    };
  }

  // =========================================================
  // 2. BUSCADOR RÁPIDO DE TICKETS PARA EL SCANNER
  // =========================================================

  async searchTickets(eventId: string, query: ScannerTicketQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 15));
    const offset = (page - 1) * limit;

    const where: WhereOptions<Ticket> = {
      eventId,
    };

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { code: { [Op.iLike]: searchPattern } },
        { guestName: { [Op.iLike]: searchPattern } },
        { guestDni: { [Op.iLike]: searchPattern } },
        { referenceTag: { [Op.iLike]: searchPattern } },
      ];
    }

    const { rows, count } = await this.ticketModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['updatedAt', 'DESC']],
    });

    return {
      items: rows,
      totalItems: count,
      page,
      limit,
    };
  }

  // =========================================================
  // 3. INGRESO / CHECK-IN EN PUERTA (TRANSACCIONAL)
  // =========================================================

  async checkIn(session: ScannerSession, dto: CheckInActionDto) {
    return this.sequelize.transaction(async (transaction) => {
      const ticket = await this.ticketModel.findOne({
        where: {
          code: dto.code.trim().toUpperCase(),
          eventId: session.eventId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!ticket) {
        throw new NotFoundException('TICKET_NOT_FOUND_IN_EVENT');
      }

      if (ticket.status === 'CANCELLED') {
        throw new BadRequestException('TICKET_CANCELLED: La invitación fue anulada');
      }

      const pendingGuests = ticket.totalGuests - ticket.checkedInCount;
      if (pendingGuests <= 0) {
        throw new BadRequestException(
          'TICKET_TOTALMENTE_UTILIZADO: Todos los integrantes ya ingresaron previamente',
        );
      }

      const qty = Math.min(dto.quantity, pendingGuests);
      if (qty <= 0) {
        throw new BadRequestException('CANTIDAD_INVALIDA');
      }

      ticket.checkedInCount += qty;
      ticket.currentlyInside += qty;

      if (ticket.checkedInCount >= ticket.totalGuests) {
        ticket.checkInStatus = 'COMPLETED';
      } else {
        ticket.checkInStatus = 'PARTIAL';
      }

      await ticket.save({ transaction });

      await this.ticketLogModel.create(
        {
          ticketId: ticket.id,
          eventId: session.eventId,
          action: 'CHECK_IN',
          quantity: qty,
          performedByPin: session.pinCode,
          notes: dto.notes?.trim() || null,
        } as any,
        { transaction },
      );

      return {
        ticket,
        action: 'CHECK_IN',
        admittedNow: qty,
        remainingPending: ticket.totalGuests - ticket.checkedInCount,
        currentlyInside: ticket.currentlyInside,
      };
    });
  }

  // =========================================================
  // 4. SALIDA TEMPORAL (TRANSACCIONAL)
  // =========================================================

  async tempExit(session: ScannerSession, dto: TempExitActionDto) {
    return this.sequelize.transaction(async (transaction) => {
      const ticket = await this.ticketModel.findOne({
        where: {
          code: dto.code.trim().toUpperCase(),
          eventId: session.eventId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!ticket) {
        throw new NotFoundException('TICKET_NOT_FOUND_IN_EVENT');
      }

      if (ticket.currentlyInside <= 0) {
        throw new BadRequestException(
          'NADIE_ADENTRO: No hay personas registradas dentro con esta entrada',
        );
      }

      const qty = Math.min(dto.quantity, ticket.currentlyInside);
      ticket.currentlyInside -= qty;

      await ticket.save({ transaction });

      await this.ticketLogModel.create(
        {
          ticketId: ticket.id,
          eventId: session.eventId,
          action: 'TEMP_EXIT',
          quantity: qty,
          performedByPin: session.pinCode,
          notes: dto.notes?.trim() || 'Salida temporal',
        } as any,
        { transaction },
      );

      return {
        ticket,
        action: 'TEMP_EXIT',
        exitedNow: qty,
        currentlyInside: ticket.currentlyInside,
      };
    });
  }

  // =========================================================
  // 5. REINGRESO (TRANSACCIONAL)
  // =========================================================

  async reEntry(session: ScannerSession, dto: ReEntryActionDto) {
    return this.sequelize.transaction(async (transaction) => {
      const ticket = await this.ticketModel.findOne({
        where: {
          code: dto.code.trim().toUpperCase(),
          eventId: session.eventId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!ticket) {
        throw new NotFoundException('TICKET_NOT_FOUND_IN_EVENT');
      }

      const maxCanReenter = ticket.checkedInCount - ticket.currentlyInside;
      if (maxCanReenter <= 0) {
        throw new BadRequestException(
          'NO_HAY_SALIDAS_TEMPORALES: Todas las personas ingresadas ya están adentro',
        );
      }

      const qty = Math.min(dto.quantity, maxCanReenter);
      ticket.currentlyInside += qty;

      await ticket.save({ transaction });

      await this.ticketLogModel.create(
        {
          ticketId: ticket.id,
          eventId: session.eventId,
          action: 'RE_ENTRY',
          quantity: qty,
          performedByPin: session.pinCode,
          notes: dto.notes?.trim() || 'Reingreso al evento',
        } as any,
        { transaction },
      );

      return {
        ticket,
        action: 'RE_ENTRY',
        reenteredNow: qty,
        currentlyInside: ticket.currentlyInside,
      };
    });
  }

  // =========================================================
  // 6. INGRESO RÁPIDO EN PUERTA (SIN INVITACIÓN PREVIA)
  // =========================================================

  async doorEntry(session: ScannerSession, dto: DoorEntryDto) {
    return this.sequelize.transaction(async (transaction) => {
      const guests = Math.max(1, Number(dto.totalGuests) || 1);
      const code = `DOOR-${Date.now().toString().slice(-6)}`;

      const ticket = await this.ticketModel.create(
        {
          eventId: session.eventId,
          code,
          guestName: dto.guestName.trim(),
          guestDni: dto.guestDni?.trim() || null,
          guestPhone: null,
          referenceTag: 'Puerta',
          notes: dto.notes?.trim() || 'Ingreso directo en puerta',
          originType: 'PUERTA',
          totalGuests: guests,
          checkedInCount: guests,
          currentlyInside: guests,
          checkInStatus: 'COMPLETED',
          status: 'VALID',
        } as any,
        { transaction },
      );

      await this.ticketLogModel.create(
        {
          ticketId: ticket.id,
          eventId: session.eventId,
          action: 'DOOR_ENTRY',
          quantity: guests,
          performedByPin: session.pinCode,
          notes: dto.notes?.trim() || 'Ingreso registrado en puerta',
        } as any,
        { transaction },
      );

      return {
        ticket,
        action: 'DOOR_ENTRY',
        guestsAdmitted: guests,
      };
    });
  }
}
