import { PartialType } from '@nestjs/mapped-types';
import { CreateCapitalDto } from './create-capital.dto';

export class UpdateCapitalDto extends PartialType(CreateCapitalDto) {}
