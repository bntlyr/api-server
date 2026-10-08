import { StatusCodeLoader } from "../../common/status-code/status-code.loader.js";
import { ItemLoader } from "../item/item.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { CustomerService } from "./customer.service.js";
import { CustomerLoader } from "./customer.loader.js";
import { CustomerQueryResolver } from "./resolvers/customer.query.js";
import { CustomerMutationResolver } from "./resolvers/customer.mutation.js";
import { CustomerRelationResolver } from "./resolvers/customer.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    StatusCodeLoader,
    ItemLoader,
    CustomerLoader,
    CustomerService,
    CustomerQueryResolver,
    CustomerMutationResolver,
    CustomerRelationResolver,
  ],
  exports: [CustomerService, CustomerLoader],
})
export class CustomerModule {}
