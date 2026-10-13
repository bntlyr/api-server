import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ShipmentTypeService } from "./shipment-type.service.js";
import { ShipmentTypeLoader } from "./shipment-type.loader.js";
import { ShipmentTypeQueryResolver } from "./resolvers/shipment-type.query.js";
import { ShipmentTypeMutationResolver } from "./resolvers/shipment-type.mutation.js";
import { ShipmentTypeRelationResolver } from "./resolvers/shipment-type.relation.js";
import { UserLoader } from "../../user/user.loader.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    ShipmentTypeLoader,
    ShipmentTypeService,
    ShipmentTypeQueryResolver,
    ShipmentTypeMutationResolver,
    ShipmentTypeRelationResolver,
  ],
  exports: [ShipmentTypeService, ShipmentTypeLoader],
})
export class ShipmentTypeModule {}
