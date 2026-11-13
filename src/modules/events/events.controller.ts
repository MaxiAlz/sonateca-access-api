import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import {
  CreateDoorCodeDto,
  CreateEventDto,
  EventFilterQueryDto,
  PublicEventFilterQueryDto,
  UpdateEventDto,
  UpdateEventStatusDto,
} from './dto/events.dto';
import { EventsService } from './events.service';

@ApiTags('Events & Door Codes')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // =========================================================
  // 1. RUTAS PÚBLICAS (CARTELERA INFORMATIVA - SIN LOGIN)
  // =========================================================

  @Get('public')
  @ApiOperation({
    summary: '[PÚBLICO] Listar eventos publicados para la Cartelera Cultural (Paginado)',
    description:
      'Devuelve únicamente los eventos en estado PUBLISHED con paginado estándar y filtros por ciudad, rango de fechas y texto libre.',
  })
  async getPublicEvents(@Query() query: PublicEventFilterQueryDto) {
    const { items, totalItems, page, limit } =
      await this.eventsService.getPublicEvents(query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'PUBLIC_EVENTS_LIST',
    );
  }

  @Get('public/:slug')
  @ApiOperation({
    summary: '[PÚBLICO] Obtener detalle informativo de un evento por su slug',
    description:
      'Ejemplo con el evento del Seeder: noche-sintetizadores-live-set-vol-4',
  })
  async getPublicEventBySlug(@Param('slug') slug: string) {
    const event = await this.eventsService.getPublicEventBySlug(slug);
    return buildApiResponse(event, 'PUBLIC_EVENT_DETAIL');
  }

  // =========================================================
  // 2. RUTAS PRIVADAS DEL PANEL (PRODUCTOR / SUPERADMIN)
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get()
  @ApiOperation({
    summary: 'Listar eventos del productor logueado (o todos si es SUPERADMIN)',
    description:
      'Soporta paginado, búsqueda por texto y filtros por estado (DRAFT, PUBLISHED, FINISHED), ciudad y fechas.',
  })
  async getMyEvents(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: EventFilterQueryDto,
  ) {
    const { items, totalItems, page, limit } =
      await this.eventsService.getMyEvents(user, query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'EVENTS_LIST',
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo evento (Genera slug y PIN de puerta automático)',
    description:
      'Crea el evento con su cupo gratuito inicial por persona (50 lugares por defecto) y genera automáticamente un PIN de 6 dígitos para la puerta.',
  })
  async createEvent(
    @CurrentUser() user: { id: string; role: string; whatsapp?: string },
    @Body() dto: CreateEventDto,
  ) {
    const event = await this.eventsService.createEvent(user, dto);
    return buildApiResponse(event, 'EVENT_CREATED');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle completo de un evento por ID (incluye PINs de puerta)',
  })
  async getEventById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const event = await this.eventsService.getEventById(id, user);
    return buildApiResponse(event, 'EVENT_DETAIL');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get(':id/metrics')
  @ApiOperation({
    summary: 'Obtener métricas en tiempo real del evento (Cupo, Invitados y Puerta)',
    description:
      'Devuelve el cupo total, lugares usados por persona, disponibles, invitados totales, personas actualmente dentro del evento, salidas temporales y pendientes de llegar.',
  })
  async getEventMetrics(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const metrics = await this.eventsService.getEventMetrics(id, user);
    return buildApiResponse(metrics, 'EVENT_METRICS');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar datos informativos de un evento',
  })
  async updateEvent(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateEventDto,
  ) {
    const updated = await this.eventsService.updateEvent(id, user, dto);
    return buildApiResponse(updated, 'EVENT_UPDATED');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar el estado del evento (DRAFT, PUBLISHED, FINISHED)',
  })
  async updateEventStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateEventStatusDto,
  ) {
    const updated = await this.eventsService.updateEventStatus(id, user, dto);
    return buildApiResponse(updated, 'EVENT_STATUS_UPDATED');
  }

  // =========================================================
  // 3. GESTIÓN DE CÓDIGOS PIN DE PUERTA (DOOR CODES)
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get(':id/door-codes')
  @ApiOperation({
    summary: 'Listar los códigos PIN de 6 dígitos del evento para portería',
  })
  async getDoorCodes(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const codes = await this.eventsService.getDoorCodes(id, user);
    return buildApiResponse(codes, 'DOOR_CODES_LIST');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Post(':id/door-codes')
  @ApiOperation({
    summary: 'Generar un nuevo código PIN de 6 dígitos para el escáner de puerta',
  })
  async createDoorCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateDoorCodeDto,
  ) {
    const code = await this.eventsService.createDoorCode(id, user, dto);
    return buildApiResponse(code, 'DOOR_CODE_CREATED');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Patch('door-codes/:codeId/toggle')
  @ApiOperation({
    summary: 'Activar o desactivar un código PIN de puerta',
  })
  async toggleDoorCode(
    @Param('codeId') codeId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const code = await this.eventsService.toggleDoorCode(codeId, user);
    return buildApiResponse(code, 'DOOR_CODE_TOGGLED');
  }
}
