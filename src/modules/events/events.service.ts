import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { DoorCode, Event, Ticket, User } from '../../database/models';
import {
  CreateDoorCodeDto,
  CreateEventDto,
  EventFilterQueryDto,
  PublicEventFilterQueryDto,
  UpdateEventDto,
  UpdateEventStatusDto,
} from './dto/events.dto';

interface AuthenticatedUser {
  id: string;
  role: string;
  whatsapp?: string;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Event) private readonly eventModel: typeof Event,
    @InjectModel(Ticket) private readonly ticketModel: typeof Ticket,
    @InjectModel(DoorCode) private readonly doorCodeModel: typeof DoorCode,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.slugify(title) || 'evento-sonateca';
    let slug = baseSlug;
    let counter = 1;

    while (await this.eventModel.findOne({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  private async generateUniquePinCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
      const exists = await this.doorCodeModel.findOne({
        where: { pinCode: randomPin },
      });
      if (!exists) {
        return randomPin;
      }
    }
    throw new BadRequestException('COULD_NOT_GENERATE_UNIQUE_PIN');
  }

  private async getAuthorizedEventOrThrow(
    eventId: string,
    user: AuthenticatedUser,
    includeDoorCodes = false,
  ): Promise<Event> {
    const event = await this.eventModel.findByPk(eventId, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'producerName', 'email', 'whatsapp'],
        },
        ...(includeDoorCodes ? [{ model: DoorCode }] : []),
      ],
    });

    if (!event) {
      throw new NotFoundException('EVENT_NOT_FOUND');
    }

    if (user.role !== 'SUPERADMIN' && event.producerId !== user.id) {
      throw new ForbiddenException('NOT_EVENT_OWNER');
    }

    return event;
  }

  // =========================================================
  // 1. ENDPOINTS PÚBLICOS (CARTELERA INFORMATIVA)
  // =========================================================

  async getPublicEvents(query: PublicEventFilterQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: WhereOptions<Event> = {
      status: 'PUBLISHED',
    };

    if (query.city && query.city.trim() !== '') {
      where.city = { [Op.iLike]: `%${query.city.trim()}%` } as any;
    }

    if (query.fromDate || query.toDate) {
      const dateFilter: any = {};
      if (query.fromDate) {
        dateFilter[Op.gte] = new Date(query.fromDate);
      }
      if (query.toDate) {
        dateFilter[Op.lte] = new Date(query.toDate);
      }
      where.eventDate = dateFilter;
    }

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { title: { [Op.iLike]: searchPattern } },
        { description: { [Op.iLike]: searchPattern } },
        { venueName: { [Op.iLike]: searchPattern } },
        { city: { [Op.iLike]: searchPattern } },
      ];
    }

    const allowedSortFields = ['eventDate', 'createdAt', 'title', 'city'];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? (query.sortBy as string)
      : 'eventDate';
    const sortOrder =
      (query.sortOrder || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { rows, count } = await this.eventModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: User,
          attributes: ['id', 'producerName', 'whatsapp'],
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

  async getPublicEventBySlug(slug: string) {
    const event = await this.eventModel.findOne({
      where: {
        slug: slug.trim().toLowerCase(),
        status: 'PUBLISHED',
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'producerName', 'whatsapp'],
        },
      ],
    });

    if (!event) {
      throw new NotFoundException('PUBLIC_EVENT_NOT_FOUND');
    }

    return event;
  }

  // =========================================================
  // 2. ENDPOINTS DEL PANEL (PRODUCTOR Y SUPERADMIN)
  // =========================================================

  async getMyEvents(user: AuthenticatedUser, query: EventFilterQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: WhereOptions<Event> = {};

    if (user.role === 'SUPERADMIN') {
      if (query.producerId) {
        where.producerId = query.producerId;
      }
    } else {
      where.producerId = user.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.city && query.city.trim() !== '') {
      where.city = { [Op.iLike]: `%${query.city.trim()}%` } as any;
    }

    if (query.fromDate || query.toDate) {
      const dateFilter: any = {};
      if (query.fromDate) {
        dateFilter[Op.gte] = new Date(query.fromDate);
      }
      if (query.toDate) {
        dateFilter[Op.lte] = new Date(query.toDate);
      }
      where.eventDate = dateFilter;
    }

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { title: { [Op.iLike]: searchPattern } },
        { slug: { [Op.iLike]: searchPattern } },
        { venueName: { [Op.iLike]: searchPattern } },
        { city: { [Op.iLike]: searchPattern } },
      ];
    }

    const allowedSortFields = [
      'eventDate',
      'createdAt',
      'title',
      'status',
      'usedTicketsQuota',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? (query.sortBy as string)
      : 'eventDate';
    const sortOrder =
      (query.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { rows, count } = await this.eventModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      include: [
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

  async getEventById(id: string, user: AuthenticatedUser) {
    return this.getAuthorizedEventOrThrow(id, user, true);
  }

  async createEvent(user: AuthenticatedUser, dto: CreateEventDto) {
    const slug = await this.generateUniqueSlug(dto.title);
    const defaultQuota =
      Number(this.configService.get<string>('DEFAULT_EVENT_QUOTA')) || 50;

    const event = await this.eventModel.create({
      producerId: user.id,
      title: dto.title.trim(),
      slug,
      description: dto.description?.trim() || null,
      venueName: dto.venueName.trim(),
      venueAddress: dto.venueAddress?.trim() || null,
      city: dto.city?.trim() || null,
      eventDate: new Date(dto.eventDate),
      doorsOpenTime: dto.doorsOpenTime?.trim() || null,
      flyerUrl: dto.flyerUrl?.trim() || null,
      contactWhatsapp: dto.contactWhatsapp?.trim() || user.whatsapp || null,
      informativePrice:
        dto.informativePrice?.trim() || 'Invitación previa / Consultar',
      status: dto.status || 'PUBLISHED',
      ticketsQuota: defaultQuota,
      usedTicketsQuota: 0,
    } as any);

    // Crear automáticamente un PIN de puerta de 6 dígitos para el evento
    const defaultPin = await this.generateUniquePinCode();
    await this.doorCodeModel.create({
      eventId: event.id,
      pinCode: defaultPin,
      label: 'Puerta Principal',
      isActive: true,
    } as any);

    return this.getAuthorizedEventOrThrow(event.id, user, true);
  }

  async updateEvent(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateEventDto,
  ) {
    const event = await this.getAuthorizedEventOrThrow(id, user);

    if (dto.title !== undefined) {
      event.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      event.description = dto.description.trim();
    }
    if (dto.venueName !== undefined) {
      event.venueName = dto.venueName.trim();
    }
    if (dto.venueAddress !== undefined) {
      event.venueAddress = dto.venueAddress.trim();
    }
    if (dto.city !== undefined) {
      event.city = dto.city.trim();
    }
    if (dto.eventDate !== undefined) {
      event.eventDate = new Date(dto.eventDate);
    }
    if (dto.doorsOpenTime !== undefined) {
      event.doorsOpenTime = dto.doorsOpenTime.trim();
    }
    if (dto.flyerUrl !== undefined) {
      event.flyerUrl = dto.flyerUrl.trim();
    }
    if (dto.contactWhatsapp !== undefined) {
      event.contactWhatsapp = dto.contactWhatsapp.trim();
    }
    if (dto.informativePrice !== undefined) {
      event.informativePrice = dto.informativePrice.trim();
    }

    await event.save();
    return this.getAuthorizedEventOrThrow(id, user, true);
  }

  async updateEventStatus(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateEventStatusDto,
  ) {
    const event = await this.getAuthorizedEventOrThrow(id, user);
    event.status = dto.status;
    await event.save();
    return event;
  }

  async getEventMetrics(id: string, user: AuthenticatedUser) {
    const event = await this.getAuthorizedEventOrThrow(id, user);

    const tickets = await this.ticketModel.findAll({
      where: { eventId: event.id },
    });

    let totalValidTickets = 0;
    let totalCancelledTickets = 0;
    let totalGuestsInvited = 0;
    let totalDoorEntries = 0;
    let totalCheckedInGuests = 0;
    let currentlyInsideGuests = 0;

    for (const t of tickets) {
      if (t.status === 'CANCELLED') {
        totalCancelledTickets += 1;
        continue;
      }

      totalValidTickets += 1;
      if (t.originType === 'PUERTA') {
        totalDoorEntries += Number(t.totalGuests) || 0;
      } else {
        totalGuestsInvited += Number(t.totalGuests) || 0;
      }

      totalCheckedInGuests += Number(t.checkedInCount) || 0;
      currentlyInsideGuests += Number(t.currentlyInside) || 0;
    }

    const totalExpectedGuests = totalGuestsInvited + totalDoorEntries;
    const tempExitGuests = Math.max(
      0,
      totalCheckedInGuests - currentlyInsideGuests,
    );
    const pendingArrivalGuests = Math.max(
      0,
      totalExpectedGuests - totalCheckedInGuests,
    );
    const availableQuota = Math.max(
      0,
      event.ticketsQuota - event.usedTicketsQuota,
    );

    return {
      eventId: event.id,
      title: event.title,
      status: event.status,
      quota: {
        ticketsQuota: event.ticketsQuota,
        usedTicketsQuota: event.usedTicketsQuota,
        availableQuota,
        usagePercentage:
          event.ticketsQuota > 0
            ? Math.min(
                100,
                Math.round((event.usedTicketsQuota / event.ticketsQuota) * 100),
              )
            : 0,
      },
      invitations: {
        totalValidTickets,
        totalCancelledTickets,
        totalGuestsInvited,
        totalDoorEntries,
        totalExpectedGuests,
      },
      attendance: {
        currentlyInsideGuests,
        totalCheckedInGuests,
        tempExitGuests,
        pendingArrivalGuests,
      },
    };
  }

  // =========================================================
  // 3. GESTIÓN DE CÓDIGOS PIN DE PUERTA (DOOR CODES)
  // =========================================================

  async getDoorCodes(eventId: string, user: AuthenticatedUser) {
    await this.getAuthorizedEventOrThrow(eventId, user);
    return this.doorCodeModel.findAll({
      where: { eventId },
      order: [['createdAt', 'DESC']],
    });
  }

  async createDoorCode(
    eventId: string,
    user: AuthenticatedUser,
    dto: CreateDoorCodeDto,
  ) {
    await this.getAuthorizedEventOrThrow(eventId, user);

    let pinCode = dto.pinCode?.trim();
    if (pinCode) {
      const existing = await this.doorCodeModel.findOne({
        where: { pinCode },
      });
      if (existing) {
        throw new BadRequestException('PIN_CODE_ALREADY_IN_USE');
      }
    } else {
      pinCode = await this.generateUniquePinCode();
    }

    return this.doorCodeModel.create({
      eventId,
      label: dto.label.trim(),
      pinCode,
      isActive: true,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    } as any);
  }

  async toggleDoorCode(codeId: string, user: AuthenticatedUser) {
    const doorCode = await this.doorCodeModel.findByPk(codeId);
    if (!doorCode) {
      throw new NotFoundException('DOOR_CODE_NOT_FOUND');
    }

    await this.getAuthorizedEventOrThrow(doorCode.eventId, user);

    doorCode.isActive = !doorCode.isActive;
    await doorCode.save();
    return doorCode;
  }
}
