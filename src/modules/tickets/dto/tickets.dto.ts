import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  TicketCheckInStatus,
  TicketOriginType,
  TicketStatus,
} from '../../../database/models/ticket.model';

export const TICKET_CHECK_IN_STATUSES: TicketCheckInStatus[] = [
  'PENDING',
  'PARTIAL',
  'COMPLETED',
  'INSIDE',
];

export const TICKET_STATUSES: TicketStatus[] = ['VALID', 'CANCELLED'];

export class TicketFilterQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'ID (UUID) del evento para listar sus invitaciones',
    example: 'd9b9a6b1-3e42-4f3e-9087-0b1a5e123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'El eventId es requerido' })
  eventId: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de ingreso',
    enum: TICKET_CHECK_IN_STATUSES,
  })
  @IsOptional()
  @IsIn(TICKET_CHECK_IN_STATUSES)
  checkInStatus?: TicketCheckInStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por validez de la invitación',
    enum: TICKET_STATUSES,
  })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por etiqueta de referencia (ej. General, Cortesía, Invitado Banda)',
    example: 'General',
  })
  @IsOptional()
  @IsString()
  referenceTag?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por origen (INVITACION o PUERTA)',
    enum: ['INVITACION', 'PUERTA'],
  })
  @IsOptional()
  @IsIn(['INVITACION', 'PUERTA'])
  originType?: TicketOriginType;
}

export class EmitTicketDto {
  @ApiProperty({
    description: 'ID (UUID) del evento al que pertenece la invitación',
    example: 'd9b9a6b1-3e42-4f3e-9087-0b1a5e123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'El eventId es requerido' })
  eventId: string;

  @ApiProperty({
    description: 'Nombre y apellido del invitado titular',
    example: 'Mariano Castro',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del invitado es requerido' })
  @MaxLength(150)
  guestName: string;

  @ApiProperty({
    description: 'DNI / Documento de identidad del invitado',
    example: '37890123',
  })
  @IsString()
  @IsNotEmpty({ message: 'El DNI del invitado es requerido' })
  @MaxLength(30)
  guestDni: string;

  @ApiProperty({
    description: 'Cantidad de personas válidas para esta invitación (x1 .. x20)',
    example: 2,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La invitación debe ser al menos para 1 persona' })
  @Max(20, { message: 'El máximo por invitación es de 20 personas' })
  totalGuests: number;

  @ApiPropertyOptional({
    description: 'Teléfono / WhatsApp para envío opcional de la invitación',
    example: '+5491122334455',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  guestPhone?: string;

  @ApiPropertyOptional({
    description:
      'Etiqueta / Referencia opcional para clasificar la invitación (ej: General, Cortesía, Invitado Banda)',
    example: 'General',
    default: 'General',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  referenceTag?: string;

  @ApiPropertyOptional({
    description: 'Notas o aclaraciones internas opcionales',
    example: 'Amigo del baterista',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
