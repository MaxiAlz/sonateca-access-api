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
import { Event } from './event.model';
import { User } from './user.model';

export type QuotaRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Table({
  tableName: 'quota_requests',
  timestamps: true,
  underscored: true,
})
export class QuotaRequest extends Model<QuotaRequest> {
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

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  producerId: string;

  @BelongsTo(() => User)
  producer: User;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  requestedGuests: number;

  @Default('PENDING')
  @Column({
    type: DataType.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: false,
  })
  status: QuotaRequestStatus;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  notes: string;
}
