import { Args, Context, Query, Resolver } from '@nestjs/graphql';
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
  async unitOfMeasurementById(@Args('id') id: string, @Context() context?: any) {
    return this.unitOfMeasurementService.findOne(id, context);
  }

  @Query('unitOfMeasurementsPaginated')
  async unitOfMeasurementsPaginated(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput | null,
    @Args('filter', { nullable: true })
    filter?: UnitOfMeasurementFilterInput | null,
    @Context() context?: any,
  ): Promise<UnitOfMeasurementConnection> {
    return this.unitOfMeasurementService.findMany(pagination, filter, context);
  }
}

