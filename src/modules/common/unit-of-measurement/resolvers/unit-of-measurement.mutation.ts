import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UnitOfMeasurementService } from '../unit-of-measurement.service.js';
import type {
  CreateUnitOfMeasurementInput,
  UpdateUnitOfMeasurementInput,
  UnitOfMeasurementPayload,
} from '../../../../generated//graphql/types.js';

@Resolver('UnitOfMeasurement')
export class UnitOfMeasurementMutationResolver {
  constructor(
    private readonly unitOfMeasurementService: UnitOfMeasurementService,
  ) {}

  @Mutation('createUnitOfMeasurement')
  async createUnitOfMeasurement(
    @Args('input') input: CreateUnitOfMeasurementInput,
    @Context() context: any,
  ): Promise<UnitOfMeasurementPayload> {
    return this.unitOfMeasurementService.create(input, context);
  }

  @Mutation('updateUnitOfMeasurement')
  async updateUnitOfMeasurement(
    @Args('id') id: string,
    @Args('input') input: UpdateUnitOfMeasurementInput,
    @Context() context: any,
  ): Promise<UnitOfMeasurementPayload> {
    return this.unitOfMeasurementService.update(id, input, context);
  }

  @Mutation('deleteUnitOfMeasurement')
  async deleteUnitOfMeasurement(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<UnitOfMeasurementPayload> {
    return this.unitOfMeasurementService.delete(id, context);
  }

  @Mutation('restoreUnitOfMeasurement')
  async restoreUnitOfMeasurement(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<UnitOfMeasurementPayload> {
    return this.unitOfMeasurementService.restore(id, context);
  }
}
