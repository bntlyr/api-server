import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { AuthModule } from "../../../auth/auth.module.js";
import { ItemModule } from "../../master/item/item.module.js";
import { FabricationModule } from "../../master/fabrication/fabrication.module.js";
import { CustomerModule } from "../../master/customer/customer.module.js";
import { SalesOrderService } from "./sales-order.service.js";
import { SalesOrderLoader } from "./sales-order.loader.js";
import { SalesOrderQueryResolver } from "./resolvers/sales-order.query.js";
import { SalesOrderMutationResolver } from "./resolvers/sales-order.mutation.js";
import { SalesOrderRelationResolver } from "./resolvers/sales-order.relation.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ItemModule,
    FabricationModule,
    CustomerModule,
  ],
  providers: [
    SalesOrderLoader,
    SalesOrderService,
    SalesOrderQueryResolver,
    SalesOrderMutationResolver,
    SalesOrderRelationResolver,
  ],
  exports: [SalesOrderService, SalesOrderLoader],
})
export class SalesOrderModule {}
