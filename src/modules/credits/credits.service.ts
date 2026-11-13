import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Event, QuotaRequest, User } from '../../database/models';
import {
  AddQuotaDto,
  QuotaRequestFilterQueryDto,
  RequestQuotaDto,
} from './dto/credits.dto';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@Injectable()
export class CreditsService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(QuotaRequest)
    private readonly quotaRequestModel: typeof QuotaRequest,
    @InjectModel(Event) private readonly eventModel: typeof Event,
  ) {}

  // =========================================================
  // 1. PRODUCTOR: SOLICITAR AMPLIACIÓN DE CUPO
  // =========================================================

  async requestQuota(user: AuthenticatedUser, dto: RequestQuotaDto) {
    const event = await this.eventModel.findByPk(dto.eventId);
    if (!event) {
      throw new NotFoundException('EVENT_NOT_FOUND');
    }

    if (user.role !== 'SUPERADMIN' && event.producerId !== user.id) {
      throw new ForbiddenException('NOT_EVENT_OWNER');
    }

    const request = await this.quotaRequestModel.create({
      eventId: event.id,
      producerId: user.id,
      requestedGuests: dto.requestedGuests,
      status: 'PENDING',
      notes: dto.notes?.trim() || null,
    } as any);

    return request;
  }

  // =========================================================
  // 2. PRODUCTOR: LISTAR SUS SOLICITUDES
  // =========================================================

  async getMyRequests(
    user: AuthenticatedUser,
    query: QuotaRequestFilterQueryDto,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: WhereOptions<QuotaRequest> = {
      producerId: user.id,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.eventId) {
      where.eventId = query.eventId;
    }

    const { rows, count } = await this.quotaRequestModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Event,
          attributes: ['id', 'title', 'ticketsQuota', 'usedTicketsQuota'],
        },
      ],
    });

    return {
      items: rows,
      totalItems: count,
      page,
      limit,
    };
  }

  // =========================================================
  // 3. SUPERADMIN: LISTAR TODAS LAS SOLICITUDES
  // =========================================================

  async adminGetAllRequests(query: QuotaRequestFilterQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: WhereOptions<QuotaRequest> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.eventId) {
      where.eventId = query.eventId;
    }

    const { rows, count } = await this.quotaRequestModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Event,
          attributes: ['id', 'title', 'ticketsQuota', 'usedTicketsQuota'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'producerName', 'email', 'whatsapp'],
        },
      ],
    });

    return {
      items: rows,
      totalItems: count,
      page,
      limit,
    };
  }

  // =========================================================
  // 4. SUPERADMIN: ACREDITAR CUPO DIRECTO A UN EVENTO
  // =========================================================

  async adminAddEventQuota(eventId: string, dto: AddQuotaDto) {
    return this.sequelize.transaction(async (transaction) => {
      const event = await this.eventModel.findByPk(eventId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!event) {
        throw new NotFoundException('EVENT_NOT_FOUND');
      }

      event.ticketsQuota += dto.additionalGuests;
      await event.save({ transaction });

      // Si había una solicitud pendiente para esta cantidad en este evento, marcarla como aprobada
      const pendingRequest = await this.quotaRequestModel.findOne({
        where: {
          eventId: event.id,
          status: 'PENDING',
        },
        order: [['createdAt', 'ASC']],
        transaction,
      });

      if (pendingRequest) {
        pendingRequest.status = 'APPROVED';
        if (dto.notes) {
          pendingRequest.notes = `${pendingRequest.notes ? pendingRequest.notes + ' | ' : ''}Acreditado: ${dto.notes}`;
        }
        await pendingRequest.save({ transaction });
      }

      return {
        event: {
          id: event.id,
          title: event.title,
          previousQuota: event.ticketsQuota - dto.additionalGuests,
          newQuota: event.ticketsQuota,
          addedGuests: dto.additionalGuests,
          usedTicketsQuota: event.usedTicketsQuota,
          availableQuota: event.ticketsQuota - event.usedTicketsQuota,
        },
        associatedRequest: pendingRequest || null,
      };
    });
  }

  // =========================================================
  // 5. SUPERADMIN: RECHAZAR SOLICITUD DE CUPO
  // =========================================================

  async adminRejectRequest(requestId: string, reason?: string) {
    const request = await this.quotaRequestModel.findByPk(requestId);
    if (!request) {
      throw new NotFoundException('QUOTA_REQUEST_NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('SOLICITUD_YA_PROCESADA');
    }

    request.status = 'REJECTED';
    if (reason) {
      request.notes = `${request.notes ? request.notes + ' | ' : ''}Rechazado: ${reason}`;
    }
    await request.save();

    return request;
  }
}
