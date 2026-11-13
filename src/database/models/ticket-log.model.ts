import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  PrimaryKey,
} from 'sequelize-typescript';
import { Ticket } from './ticket.model';
import { Event } from './event.model';

export type TicketLogAction =
  | 'CHECK_IN'
  | 'TEMP_EXIT'
  | 'RE_ENTRY'
  | 'DOOR_ENTRY'
  | 'CANCELLED';

@Table({
  tableName: 'ticket_logs',
  timestamps: true,
  underscored: true,
})
export class TicketLog extends Model<TicketLog> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Ticket)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  ticketId: string;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Event)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  eventId: string;

  @BelongsTo(() => Event)
  event: Event;

  @Column({
    type: DataType.ENUM(
      'CHECK_IN',
      'TEMP_EXIT',
      'RE_ENTRY',
      'DOOR_ENTRY',
      'CANCELLED',
    ),
    allowNull: false,
  })
  action: TicketLogAction;

  @Default(1)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quantity: number;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
  })
  performedByPin: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  notes: string;
}
