import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { AuthModule } from "../../auth/auth.module.js";
import { BoxContainerModule } from "../master/box-container/box-container.module.js";
import { PalletContainerLoader } from "./pallet-container.loader.js";
import { PalletContainerService } from "./pallet-container.service.js";
import { PalletContainerMutationResolver } from "./resolvers/pallet-container.mutation.js";
import { PalletContainerRelationResolver } from "./resolvers/pallet-container.relation.js";
import { ShipmentLoader } from "./shipment.loader.js";
import { ShipmentService } from "./shipment.service.js";
import { ShipmentMutationResolver } from "./resolvers/shipment.mutation.js";
import { ShipmentQueryResolver } from "./resolvers/shipment.query.js";
import { ShipmentRelationResolver } from "./resolvers/shipment.relation.js";

@Module({
  imports: [PrismaModule, AuthModule, BoxContainerModule],
  providers: [
    ShipmentLoader,
    PalletContainerLoader,
    ShipmentService,
    PalletContainerService,
    ShipmentQueryResolver,
    ShipmentMutationResolver,
    ShipmentRelationResolver,
    PalletContainerMutationResolver,
    PalletContainerRelationResolver,
  ],
  exports: [ShipmentService, PalletContainerService, ShipmentLoader, PalletContainerLoader],
})
export class ShippingModule {}
