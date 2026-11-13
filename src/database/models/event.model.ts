import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Default,
  PrimaryKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Ticket } from './ticket.model';
import { DoorCode } from './door-code.model';
import { QuotaRequest } from './quota-request.model';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'FINISHED';

@Table({
  tableName: 'events',
  timestamps: true,
  underscored: true,
})
export class Event extends Model<Event> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  producerId: string;

  @BelongsTo(() => User)
  producer: User;

  @Column({
    type: DataType.STRING(180),
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  venueName: string;

  @Column({
    type: DataType.STRING(220),
    allowNull: true,
  })
  venueAddress: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  eventDate: Date;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  doorsOpenTime: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  flyerUrl: string;

  @Column({
    type: DataType.STRING(40),
    allowNull: true,
  })
  contactWhatsapp: string;

  @Column({
    type: DataType.STRING(80),
    allowNull: true,
    comment: 'Texto o valor informativo para la cartelera (ej. "$5.000" o "Entrada Libre")',
  })
  informativePrice: string;

  @Default('PUBLISHED')
  @Column({
    type: DataType.ENUM('DRAFT', 'PUBLISHED', 'FINISHED'),
    allowNull: false,
  })
  status: EventStatus;

  @Default(50)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Cupo total de personas habilitadas para emitir invitaciones digitales',
  })
  ticketsQuota: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Cantidad de personas ya utilizadas del cupo (descuenta por totalGuests)',
  })
  usedTicketsQuota: number;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => DoorCode)
  doorCodes: DoorCode[];

  @HasMany(() => QuotaRequest)
  quotaRequests: QuotaRequest[];
}
