import { PartialType } from '@nestjs/mapped-types';
import { CreateCashAuditDto } from './create-cash-audit.dto';

export class UpdateCashAuditDto extends PartialType(CreateCashAuditDto) {}
