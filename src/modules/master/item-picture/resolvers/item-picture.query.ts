import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ItemPictureService } from "../item-picture.service.js";
import type {
  ItemPictureFilterInput,
  PaginationInput,
  ItemPictureConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemPicture")
export class ItemPictureQueryResolver {
  constructor(private readonly itemPictureService: ItemPictureService) {}

  @Query("itemPictureById")
  async itemPictureById(@Args("id") id: string, @Context() context?: any) {
    return this.itemPictureService.findOne(id, context);
  }

  @Query("itemPicturesPaginated")
  async itemPicturesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemPictureFilterInput | null,
    @Context() context?: any,
  ): Promise<ItemPictureConnection> {
    return this.itemPictureService.findMany(pagination, filter, context);
  }
}
