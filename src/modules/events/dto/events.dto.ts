import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EventStatus } from '../../../database/models/event.model';

export const EVENT_STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'FINISHED'];

export class PublicEventFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ciudad',
    example: 'Buenos Aires',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filtrar eventos desde esta fecha (ISO 8601)',
    example: '2026-11-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrar eventos hasta esta fecha (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class EventFilterQueryDto extends PublicEventFilterQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado del evento',
    enum: EVENT_STATUSES,
  })
  @IsOptional()
  @IsIn(EVENT_STATUSES, {
    message: 'El estado debe ser DRAFT, PUBLISHED o FINISHED',
  })
  status?: EventStatus;

  @ApiPropertyOptional({
    description: '[Solo SUPERADMIN] Filtrar por ID de productor',
  })
  @IsOptional()
  @IsString()
  producerId?: string;
}

export class CreateEventDto {
  @ApiProperty({
    description: 'Título del evento o fecha en vivo',
    example: 'Festival Acústico & Vinilos - Edición Primavera',
  })
  @IsString()
  @IsNotEmpty({ message: 'El título del evento es obligatorio' })
  @MaxLength(180)
  title: string;

  @ApiPropertyOptional({
    description: 'Descripción informativa del evento, artistas y propuesta',
    example:
      'Tres bandas en vivo, feria de discos independientes y barra cultural. Sonido e iluminación por SONATECA.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Nombre del lugar / sala / centro cultural',
    example: 'Centro Cultural Galpón B',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del lugar (venueName) es obligatorio' })
  @MaxLength(150)
  venueName: string;

  @ApiPropertyOptional({
    description: 'Dirección física del lugar',
    example: 'Cochabamba 2536',
  })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  venueAddress?: string;

  @ApiPropertyOptional({
    description: 'Ciudad o localidad',
    example: 'Buenos Aires',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio del evento (formato ISO 8601)',
    example: '2026-11-28T21:00:00.000Z',
  })
  @IsDateString(
    {},
    { message: 'Debe proporcionar una fecha válida en formato ISO' },
  )
  eventDate: string;

  @ApiPropertyOptional({
    description: 'Horario de apertura de puerta (texto informativo)',
    example: '21:00 hs',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  doorsOpenTime?: string;

  @ApiPropertyOptional({
    description: 'URL de la imagen / flyer del evento',
    example:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80',
  })
  @IsOptional()
  @IsString()
  flyerUrl?: string;

  @ApiPropertyOptional({
    description:
      'Número de WhatsApp de contacto para la cartelera pública (si se omite, usa el del productor)',
    example: '+5491122334455',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactWhatsapp?: string;

  @ApiPropertyOptional({
    description:
      'Condición o precio informativo para la cartelera (el sistema no procesa pagos)',
    example: 'Invitación previa por WhatsApp / Capacidad limitada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  informativePrice?: string;

  @ApiPropertyOptional({
    description: 'Estado inicial del evento',
    enum: EVENT_STATUSES,
    default: 'PUBLISHED',
    example: 'PUBLISHED',
  })
  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: EventStatus;
}

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Título del evento',
    example: 'Festival Acústico & Vinilos - Edición Especial',
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({
    description: 'Descripción informativa del evento',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Nombre del lugar',
    example: 'Centro Cultural Galpón B',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  venueName?: string;

  @ApiPropertyOptional({
    description: 'Dirección física del lugar',
    example: 'Cochabamba 2536',
  })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  venueAddress?: string;

  @ApiPropertyOptional({
    description: 'Ciudad o localidad',
    example: 'Buenos Aires',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Fecha y hora del evento (ISO 8601)',
    example: '2026-11-28T21:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({
    description: 'Horario de apertura de puerta',
    example: '21:30 hs',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  doorsOpenTime?: string;

  @ApiPropertyOptional({
    description: 'URL del flyer del evento',
  })
  @IsOptional()
  @IsString()
  flyerUrl?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp de contacto público',
    example: '+5491122334455',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactWhatsapp?: string;

  @ApiPropertyOptional({
    description: 'Condición o precio informativo para la cartelera',
    example: 'Entrada por lista de invitados',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  informativePrice?: string;
}

export class UpdateEventStatusDto {
  @ApiProperty({
    description: 'Nuevo estado del evento',
    enum: EVENT_STATUSES,
    example: 'PUBLISHED',
  })
  @IsIn(EVENT_STATUSES, {
    message: 'El estado debe ser DRAFT, PUBLISHED o FINISHED',
  })
  status: EventStatus;
}

export class CreateDoorCodeDto {
  @ApiProperty({
    description: 'Etiqueta identificadora del acceso o portero',
    example: 'Acceso General - Portero 2',
  })
  @IsString()
  @IsNotEmpty({ message: 'La etiqueta del PIN es obligatoria' })
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    description:
      'PIN numérico de 6 dígitos (opcional: si no se envía, el sistema genera uno único automáticamente)',
    example: '592814',
  })
  @IsOptional()
  @Matches(/^\d{6}$/, {
    message: 'El código PIN debe contener exactamente 6 dígitos numéricos',
  })
  pinCode?: string;

  @ApiPropertyOptional({
    description: 'Fecha de expiración opcional del PIN (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
