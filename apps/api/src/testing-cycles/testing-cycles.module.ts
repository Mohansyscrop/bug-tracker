import { Module } from '@nestjs/common';
import { TestingCyclesController } from './testing-cycles.controller';
import { TestingCyclesService } from './testing-cycles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestingCyclesController],
  providers: [TestingCyclesService],
  exports: [TestingCyclesService],
})
export class TestingCyclesModule {}
