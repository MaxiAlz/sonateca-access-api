import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  buildApiResponse,
  buildPaginatedResponse,
} from '../../common/interfaces/api-response.interface';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { EmitTicketDto, TicketFilterQueryDto } from './dto/tickets.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets & Invitations')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // =========================================================
  // 1. CONSULTA PÚBLICA DE ENTRADA QR (SIN LOGIN)
  // =========================================================

  @Get('public/:code')
  @ApiOperation({
    summary: '[PÚBLICO] Obtener entrada digital por código QR (ej: SNT-1001)',
    description:
      'Endpoint sin login que devuelve el flyer, lugar, fecha y datos del ticket para que el invitado presente en la puerta de entrada.',
  })
  async getPublicTicketByCode(@Param('code') code: string) {
    const ticket = await this.ticketsService.getPublicTicketByCode(code);
    return buildApiResponse(ticket, 'TICKET_DETAIL');
  }

  // =========================================================
  // 2. PANEL DEL PRODUCTOR (REQUIERE LOGIN)
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({
    summary: 'Emitir invitación digital individual o grupal (xN) - Transaccional',
    description:
      'Emite una invitación descontando la cantidad de personas (totalGuests) del cupo total del evento. Si el cupo restante no alcanza, la operación se rechaza atómicamente.',
  })
  async emitTicket(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: EmitTicketDto,
  ) {
    const ticket = await this.ticketsService.emitTicket(user, dto);
    return buildApiResponse(ticket, 'TICKET_EMITTED');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get()
  @ApiOperation({
    summary: 'Listado paginado de invitaciones de un evento con filtros y búsqueda',
    description:
      'Permite buscar por texto (nombre, DNI, código), filtrar por checkInStatus (PENDING, PARTIAL, COMPLETED, INSIDE), por estado (VALID, CANCELLED) o por etiqueta (referenceTag).',
  })
  async getTickets(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: TicketFilterQueryDto,
  ) {
    const { items, totalItems, page, limit } =
      await this.ticketsService.getTickets(user, query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'TICKETS_LIST',
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Anular una invitación emitida y liberar su cupo en el evento',
    description:
      'Cambia el estado de la invitación a CANCELLED y restituye automáticamente los lugares en el cupo del evento (usedTicketsQuota -= totalGuests). Solo se permite si nadie ingresó aún.',
  })
  async cancelTicket(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const ticket = await this.ticketsService.cancelTicket(id, user);
    return buildApiResponse(ticket, 'TICKET_CANCELLED');
  }
}
