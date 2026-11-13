import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  buildApiResponse,
  buildPaginatedResponse,
} from '../../common/interfaces/api-response.interface';
import {
  CheckInActionDto,
  DoorEntryDto,
  ReEntryActionDto,
  ScannerLoginDto,
  ScannerTicketQueryDto,
  TempExitActionDto,
} from './dto/scanner.dto';
import { CurrentScanner, ScannerAuthGuard } from './guards/scanner.guard';
import { ScannerService, ScannerSession } from './scanner.service';

@ApiTags('Scanner & Door Control')
@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('auth')
  @ApiOperation({
    summary: 'Autenticación del portero mediante PIN de 6 dígitos',
    description:
      'Valida el PIN generado para el evento y devuelve un accessToken específico de escáner junto con los datos del evento.',
  })
  async authenticate(@Body() dto: ScannerLoginDto) {
    const result = await this.scannerService.authenticatePin(dto);
    return buildApiResponse(result, 'SCANNER_AUTH_SUCCESS');
  }

  @UseGuards(ScannerAuthGuard)
  @ApiBearerAuth('scanner-token')
  @Get('tickets')
  @ApiOperation({
    summary: 'Buscador rápido de invitaciones en puerta (por DNI, Nombre o Código QR)',
    description:
      'Devuelve las invitaciones del evento para el escáner con latencia mínima.',
  })
  async searchTickets(
    @CurrentScanner() session: ScannerSession,
    @Query() query: ScannerTicketQueryDto,
  ) {
    const { items, totalItems, page, limit } =
      await this.scannerService.searchTickets(session.eventId, query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'SCANNER_TICKETS_LIST',
    );
  }

  @UseGuards(ScannerAuthGuard)
  @ApiBearerAuth('scanner-token')
  @Post('check-in')
  @ApiOperation({
    summary: 'Registrar ingreso (Check-In) de N personas de una invitación (x1 .. xN)',
    description:
      'Registra el ingreso de personas del grupo. Si entran todos pasa a COMPLETED; si entran algunos pasa a PARTIAL. Imposible admitir más de los permitidos.',
  })
  async checkIn(
    @CurrentScanner() session: ScannerSession,
    @Body() dto: CheckInActionDto,
  ) {
    const result = await this.scannerService.checkIn(session, dto);
    return buildApiResponse(result, 'CHECK_IN_SUCCESS');
  }

  @UseGuards(ScannerAuthGuard)
  @ApiBearerAuth('scanner-token')
  @Post('temp-exit')
  @ApiOperation({
    summary: 'Registrar Salida Temporal (-1 persona que estaba adentro)',
    description:
      'Marca la salida momentánea de personas que estaban adentro (ej. salir a fumar). Disminuye currentlyInside pero mantiene el registro del ingreso previo.',
  })
  async tempExit(
    @CurrentScanner() session: ScannerSession,
    @Body() dto: TempExitActionDto,
  ) {
    const result = await this.scannerService.tempExit(session, dto);
    return buildApiResponse(result, 'TEMP_EXIT_SUCCESS');
  }

  @UseGuards(ScannerAuthGuard)
  @ApiBearerAuth('scanner-token')
  @Post('re-entry')
  @ApiOperation({
    summary: 'Registrar Reingreso (+1 persona que había salido temporalmente)',
    description:
      'Permite el reingreso únicamente si currentlyInside es menor a los que ya habían entrado (checkedInCount).',
  })
  async reEntry(
    @CurrentScanner() session: ScannerSession,
    @Body() dto: ReEntryActionDto,
  ) {
    const result = await this.scannerService.reEntry(session, dto);
    return buildApiResponse(result, 'RE_ENTRY_SUCCESS');
  }

  @UseGuards(ScannerAuthGuard)
  @ApiBearerAuth('scanner-token')
  @Post('door-entry')
  @ApiOperation({
    summary: 'Registrar ingreso directo en puerta (sin invitación previa)',
    description:
      'Genera un pase de origen PUERTA e incrementa el contador de personas dentro del recinto.',
  })
  async doorEntry(
    @CurrentScanner() session: ScannerSession,
    @Body() dto: DoorEntryDto,
  ) {
    const result = await this.scannerService.doorEntry(session, dto);
    return buildApiResponse(result, 'DOOR_ENTRY_SUCCESS');
  }
}
