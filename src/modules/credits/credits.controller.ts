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
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/auth.guards';
import { CreditsService } from './credits.service';
import {
  AddQuotaDto,
  QuotaRequestFilterQueryDto,
  RequestQuotaDto,
} from './dto/credits.dto';

@ApiTags('Credits & Quotas')
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // =========================================================
  // 1. ENDPOINTS DEL PRODUCTOR
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Post('request')
  @ApiOperation({
    summary: 'Solicitar ampliación de cupo de personas para un evento (Productor)',
    description:
      'Registra una solicitud de ampliación de cupo en estado PENDING para que el SuperAdmin la valide tras el acuerdo de pago o transferencia externa.',
  })
  async requestQuota(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: RequestQuotaDto,
  ) {
    const result = await this.creditsService.requestQuota(user, dto);
    return buildApiResponse(result, 'QUOTA_REQUEST_CREATED');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get('my-requests')
  @ApiOperation({
    summary: 'Listar solicitudes de ampliación de cupo del productor logueado',
  })
  async getMyRequests(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: QuotaRequestFilterQueryDto,
  ) {
    const { items, totalItems, page, limit } =
      await this.creditsService.getMyRequests(user, query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'MY_QUOTA_REQUESTS_LIST',
    );
  }

  // =========================================================
  // 2. ENDPOINTS DE SUPERADMIN
  // =========================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get('admin/requests')
  @ApiOperation({
    summary: '[SUPERADMIN] Listar todas las solicitudes de cupo de todos los productores',
  })
  async adminGetAllRequests(@Query() query: QuotaRequestFilterQueryDto) {
    const { items, totalItems, page, limit } =
      await this.creditsService.adminGetAllRequests(query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'ALL_QUOTA_REQUESTS_LIST',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Post('admin/events/:eventId/add-quota')
  @ApiOperation({
    summary: '[SUPERADMIN] Acreditar cupo adicional directamente a un evento',
    description:
      'Incrementa el ticketsQuota del evento en additionalGuests. Si había solicitudes PENDING en ese evento, se marcan como APPROVED automáticamente.',
  })
  async adminAddEventQuota(
    @Param('eventId') eventId: string,
    @Body() dto: AddQuotaDto,
  ) {
    const result = await this.creditsService.adminAddEventQuota(eventId, dto);
    return buildApiResponse(result, 'QUOTA_ADDED_SUCCESS');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Patch('admin/requests/:requestId/reject')
  @ApiOperation({
    summary: '[SUPERADMIN] Rechazar una solicitud de ampliación de cupo',
  })
  async adminRejectRequest(
    @Param('requestId') requestId: string,
    @Body('reason') reason?: string,
  ) {
    const result = await this.creditsService.adminRejectRequest(requestId, reason);
    return buildApiResponse(result, 'QUOTA_REQUEST_REJECTED');
  }
}
