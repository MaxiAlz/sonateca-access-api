import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Event, Ticket, TicketLog, User } from '../../database/models';
import { EmitTicketDto, TicketFilterQueryDto } from './dto/tickets.dto';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Ticket) private readonly ticketModel: typeof Ticket,
    @InjectModel(Event) private readonly eventModel: typeof Event,
    @InjectModel(TicketLog) private readonly ticketLogModel: typeof TicketLog,
  ) {}

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 25; i++) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `SNT-${randomNum}`;
      const exists = await this.ticketModel.findOne({ where: { code } });
      if (!exists) {
        return code;
      }
    }
    // Si hay colisión, usar timestamp corto
    return `SNT-${Date.now().toString().slice(-6)}`;
  }

  private async checkEventAuthorization(
    eventId: string,
    user: AuthenticatedUser,
  ): Promise<Event> {
    const event = await this.eventModel.findByPk(eventId);
    if (!event) {
      throw new NotFoundException('EVENT_NOT_FOUND');
    }
    if (user.role !== 'SUPERADMIN' && event.producerId !== user.id) {
      throw new ForbiddenException('NOT_EVENT_OWNER');
    }
    return event;
  }

  // =========================================================
  // 1. EMISIÓN DE INVITACIONES (TRANSACCIONAL)
  // =========================================================

  async emitTicket(user: AuthenticatedUser, dto: EmitTicketDto) {
    const event = await this.checkEventAuthorization(dto.eventId, user);

    const guests = Math.max(1, Number(dto.totalGuests) || 1);

    // Ejecución en transacción atómica para garantizar que no se sobrepase el cupo
    return this.sequelize.transaction(async (transaction) => {
      // Bloquear fila del evento para evitar condiciones de carrera concurrentes
      const lockedEvent = await this.eventModel.findByPk(event.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedEvent) {
        throw new NotFoundException('EVENT_NOT_FOUND');
      }

      const availableQuota =
        lockedEvent.ticketsQuota - lockedEvent.usedTicketsQuota;
      if (guests > availableQuota) {
        throw new BadRequestException(
          `CUPO_INSUFICIENTE: Se solicitaron ${guests} lugares pero solo quedan ${availableQuota} disponibles en el evento.`,
        );
      }

      const code = await this.generateUniqueCode();
      const normalizedDni = dto.guestDni
        ? dto.guestDni.trim().replace(/[.\s-]/g, '')
        : null;

      const ticket = await this.ticketModel.create(
        {
          eventId: lockedEvent.id,
          code,
          guestName: dto.guestName.trim(),
          guestDni: normalizedDni,
          guestPhone: dto.guestPhone?.trim() || null,
          referenceTag: dto.referenceTag?.trim() || 'General',
          notes: dto.notes?.trim() || null,
          originType: 'INVITACION',
          totalGuests: guests,
          checkedInCount: 0,
          currentlyInside: 0,
          checkInStatus: 'PENDING',
          status: 'VALID',
          createdByUserId: user.id,
        } as any,
        { transaction },
      );

      // Descontar cupo en personas
      lockedEvent.usedTicketsQuota += guests;
      await lockedEvent.save({ transaction });

      return ticket;
    });
  }

  // =========================================================
  // 2. LISTADO PAGINADO DE INVITACIONES
  // =========================================================

  async getTickets(user: AuthenticatedUser, query: TicketFilterQueryDto) {
    await this.checkEventAuthorization(query.eventId, user);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: WhereOptions<Ticket> = {
      eventId: query.eventId,
    };

    if (query.checkInStatus) {
      where.checkInStatus = query.checkInStatus;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.referenceTag && query.referenceTag.trim() !== '') {
      where.referenceTag = {
        [Op.iLike]: `%${query.referenceTag.trim()}%`,
      } as any;
    }

    if (query.originType) {
      where.originType = query.originType;
    }

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { code: { [Op.iLike]: searchPattern } },
        { guestName: { [Op.iLike]: searchPattern } },
        { guestDni: { [Op.iLike]: searchPattern } },
        { guestPhone: { [Op.iLike]: searchPattern } },
        { referenceTag: { [Op.iLike]: searchPattern } },
      ];
    }

    const allowedSortFields = [
      'createdAt',
      'guestName',
      'totalGuests',
      'checkInStatus',
      'status',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder =
      (query.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { rows, count } = await this.ticketModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    return {
      items: rows,
      totalItems: count,
      page,
      limit,
    };
  }

  // =========================================================
  // 3. ANULACIÓN DE INVITACIÓN (LIBERACIÓN DE CUPO ATÓMICA)
  // =========================================================

  async cancelTicket(id: string, user: AuthenticatedUser) {
    return this.sequelize.transaction(async (transaction) => {
      const ticket = await this.ticketModel.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!ticket) {
        throw new NotFoundException('TICKET_NOT_FOUND');
      }

      const event = await this.eventModel.findByPk(ticket.eventId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!event) {
        throw new NotFoundException('EVENT_NOT_FOUND');
      }

      if (user.role !== 'SUPERADMIN' && event.producerId !== user.id) {
        throw new ForbiddenException('NOT_EVENT_OWNER');
      }

      if (ticket.status === 'CANCELLED') {
        throw new BadRequestException('TICKET_ALREADY_CANCELLED');
      }

      if (ticket.checkedInCount > 0 || ticket.currentlyInside > 0) {
        throw new BadRequestException(
          'NO_SE_PUEDE_ANULAR: La invitación ya fue utilizada en puerta.',
        );
      }

      // Marcar como cancelada
      ticket.status = 'CANCELLED';
      await ticket.save({ transaction });

      // Liberar cupo del evento si provenía de invitación
      if (ticket.originType === 'INVITACION') {
        event.usedTicketsQuota = Math.max(
          0,
          event.usedTicketsQuota - ticket.totalGuests,
        );
        await event.save({ transaction });
      }

      // Registrar en el log de auditoría
      await this.ticketLogModel.create(
        {
          ticketId: ticket.id,
          eventId: event.id,
          action: 'CANCELLED',
          quantity: ticket.totalGuests,
          notes: 'Invitación anulada por el productor/admin',
        } as any,
        { transaction },
      );

      return ticket;
    });
  }

  // =========================================================
  // 4. CONSULTA PÚBLICA DE LA INVITACIÓN DIGITAL QR (/t/:code)
  // =========================================================

  async getPublicTicketByCode(code: string) {
    const ticket = await this.ticketModel.findOne({
      where: {
        code: code.trim().toUpperCase(),
      },
      include: [
        {
          model: Event,
          attributes: [
            'id',
            'title',
            'venueName',
            'venueAddress',
            'city',
            'eventDate',
            'doorsOpenTime',
            'flyerUrl',
            'informativePrice',
            'status',
          ],
          include: [
            {
              model: User,
              attributes: ['producerName', 'whatsapp'],
            },
          ],
        },
      ],
    });

    if (!ticket) {
      throw new NotFoundException('TICKET_NOT_FOUND');
    }

    return ticket;
  }
}
