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
import { Event } from './event.model';
import { User } from './user.model';
import { TicketLog } from './ticket-log.model';

export type TicketOriginType = 'INVITACION' | 'PUERTA';
export type TicketCheckInStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'INSIDE';
export type TicketStatus = 'VALID' | 'CANCELLED';

@Table({
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
})
export class Ticket extends Model<Ticket> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Event)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  eventId: string;

  @BelongsTo(() => Event)
  event: Event;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    unique: true,
    comment: 'Código único de invitación QR (ej. SNT-8492)',
  })
  code: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  guestName: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
  })
  guestDni: string;

  @Column({
    type: DataType.STRING(40),
    allowNull: true,
  })
  guestPhone: string;

  @Default('General')
  @Column({
    type: DataType.STRING(80),
    allowNull: true,
    comment: 'Etiqueta o referencia interna (ej. General, Cortesía, Invitado Banda)',
  })
  referenceTag: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  notes: string;

  @Default('INVITACION')
  @Column({
    type: DataType.ENUM('INVITACION', 'PUERTA'),
    allowNull: false,
  })
  originType: TicketOriginType;

  @Default(1)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Cantidad total de personas habilitadas en esta invitación (xN)',
  })
  totalGuests: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Cantidad acumulada de personas del grupo que ya hicieron su primer ingreso',
  })
  checkedInCount: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Cantidad de personas de este ticket que están actualmente dentro del lugar',
  })
  currentlyInside: number;

  @Default('PENDING')
  @Column({
    type: DataType.ENUM('PENDING', 'PARTIAL', 'COMPLETED', 'INSIDE'),
    allowNull: false,
  })
  checkInStatus: TicketCheckInStatus;

  @Default('VALID')
  @Column({
    type: DataType.ENUM('VALID', 'CANCELLED'),
    allowNull: false,
  })
  status: TicketStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  createdByUserId: string;

  @BelongsTo(() => User)
  createdByUser: User;

  @HasMany(() => TicketLog)
  logs: TicketLog[];
}
