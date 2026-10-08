import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async itemPictureById(@Args("id") id: string) {
    return this.itemPictureService.findOne(id);
  }

  @Query("itemPicturesPaginated")
  async itemPicturesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemPictureFilterInput | null,
  ): Promise<ItemPictureConnection> {
    return this.itemPictureService.findMany(pagination, filter);
  }
}
