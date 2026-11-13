import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { QuotaRequestStatus } from '../../../database/models/quota-request.model';

export const QUOTA_REQUEST_STATUSES: QuotaRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

export class RequestQuotaDto {
  @ApiProperty({
    description: 'ID (UUID) del evento para el cual se solicita más cupo',
    example: 'd9b9a6b1-3e42-4f3e-9087-0b1a5e123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'El eventId es requerido' })
  eventId: string;

  @ApiProperty({
    description: 'Cantidad de personas adicionales solicitadas (ej: 50, 100, 200)',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Debe solicitar al menos 1 lugar adicional' })
  requestedGuests: number;

  @ApiPropertyOptional({
    description: 'Nota o motivo de la ampliación (ej. comprobante de transferencia o motivo)',
    example: 'Transferencia realizada por pack de 50 personas extra',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class AddQuotaDto {
  @ApiProperty({
    description: 'Cantidad de personas a sumar directamente al cupo del evento',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Debe sumar al menos 1 lugar' })
  additionalGuests: number;

  @ApiPropertyOptional({
    description: 'Nota u observación del SuperAdmin',
    example: 'Acreditado tras recibir comprobante bancario',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class QuotaRequestFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de la solicitud',
    enum: QUOTA_REQUEST_STATUSES,
  })
  @IsOptional()
  @IsIn(QUOTA_REQUEST_STATUSES)
  status?: QuotaRequestStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por eventId',
  })
  @IsOptional()
  @IsString()
  eventId?: string;
}
