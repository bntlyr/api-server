import { Args, Query, Resolver } from '@nestjs/graphql';
import { UnitOfMeasurementService } from '../unit-of-measurement.service.js';
import type {
  UnitOfMeasurementFilterInput,
  PaginationInput,
  UnitOfMeasurementConnection,
} from '../../../../generated//graphql/types.js';

@Resolver('UnitOfMeasurement')
export class UnitOfMeasurementQueryResolver {
  constructor(
    private readonly unitOfMeasurementService: UnitOfMeasurementService,
  ) {}

  @Query('unitOfMeasurementById')
  async unitOfMeasurementById(@Args('id') id: string) {
    return this.unitOfMeasurementService.findOne(id);
  }

  @Query('unitOfMeasurementsPaginated')
  async unitOfMeasurementsPaginated(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput | null,
    @Args('filter', { nullable: true })
    filter?: UnitOfMeasurementFilterInput | null,
  ): Promise<UnitOfMeasurementConnection> {
    return this.unitOfMeasurementService.findMany(pagination, filter);
  }
}
