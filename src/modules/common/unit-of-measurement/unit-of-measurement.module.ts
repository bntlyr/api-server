import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma//index.js';
import { UnitOfMeasurementService } from './unit-of-measurement.service.js';
import { UnitOfMeasurementLoader } from './unit-of-measurement.loader.js';
import { UnitOfMeasurementQueryResolver } from './resolvers/unit-of-measurement.query.js';
import { UnitOfMeasurementMutationResolver } from './resolvers/unit-of-measurement.mutation.js';

@Module({
  imports: [PrismaModule],
  providers: [
    UnitOfMeasurementLoader,
    UnitOfMeasurementService,
    UnitOfMeasurementQueryResolver,
    UnitOfMeasurementMutationResolver,
  ],
  exports: [UnitOfMeasurementService, UnitOfMeasurementLoader],
})
export class UnitOfMeasurementModule {}
