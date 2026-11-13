import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildApiResponse } from './common/interfaces/api-response.interface';
import {
  DoorCode,
  Event,
  QuotaRequest,
  Ticket,
  TicketLog,
  User,
} from './database/models';

@ApiTags('Health & Database')
@Controller('health')
export class AppController {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Event) private readonly eventModel: typeof Event,
    @InjectModel(Ticket) private readonly ticketModel: typeof Ticket,
    @InjectModel(TicketLog) private readonly ticketLogModel: typeof TicketLog,
    @InjectModel(DoorCode) private readonly doorCodeModel: typeof DoorCode,
    @InjectModel(QuotaRequest)
    private readonly quotaRequestModel: typeof QuotaRequest,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar estado de la API (Healthcheck)',
    description: 'Confirma que el servidor NestJS está respondiendo correctamente.',
  })
  checkHealth() {
    return buildApiResponse(
      {
        service: 'sonateca-access-backend',
        status: 'OK',
        timestamp: new Date().toISOString(),
      },
      'API_ONLINE',
    );
  }

  @Get('db')
  @ApiOperation({
    summary: 'Verificar conexión a PostgreSQL y tablas creadas por Sequelize',
    description:
      'Consulta en tiempo real la cantidad de registros en las 6 tablas de la base de datos sonateca_access.',
  })
  async checkDatabase() {
    const [
      users,
      events,
      tickets,
      ticketLogs,
      doorCodes,
      quotaRequests,
    ] = await Promise.all([
      this.userModel.count(),
      this.eventModel.count(),
      this.ticketModel.count(),
      this.ticketLogModel.count(),
      this.doorCodeModel.count(),
      this.quotaRequestModel.count(),
    ]);

    return buildApiResponse(
      {
        database: 'sonateca_access',
        orm: 'Sequelize (PostgreSQL)',
        tables: {
          users,
          events,
          tickets,
          ticket_logs: ticketLogs,
          door_codes: doorCodes,
          quota_requests: quotaRequests,
        },
      },
      'DATABASE_CONNECTED',
    );
  }
}
