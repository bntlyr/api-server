import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MaterialIssuanceService } from "../material-issuance.service.js";
import type {
  CreateMaterialIssuanceInput,
  MaterialIssuancePayload,
} from "../../../../generated/graphql/types.js";

@Resolver("MaterialIssuance")
export class MaterialIssuanceMutationResolver {
  constructor(private readonly service: MaterialIssuanceService) {}

  @Mutation("createMaterialIssuance")
  async createMaterialIssuance(
    @Args("input") input: CreateMaterialIssuanceInput,
    @Context() context: any,
  ): Promise<MaterialIssuancePayload> {
    return this.service.create(input, context);
  }
}
