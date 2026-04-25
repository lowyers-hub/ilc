import { Controller, Get, Param } from '@nestjs/common';

import { LawyersService } from './lawyers.service';

@Controller('lawyers')
export class LawyersController {
  constructor(private lawyers: LawyersService) {}

  @Get()
  async list() {
    return { items: await this.lawyers.list(), nextCursor: null };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.lawyers.getById(id);
  }
}

