import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { SectionLoader } from "../../master/section/section.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { MaterialLoader } from "../../master/material/material.loader.js";
import { AreaLoader } from "../../master/area/area.loader.js";
import { LocationLoader } from "../../master/location/location.loader.js";
import { MaterialInventoryLoader } from "../material-inventory/material-inventory.loader.js";
import { MaterialIssuanceLoader } from "./material-issuance.loader.js";
import { MaterialIssuanceService } from "./material-issuance.service.js";
import { MaterialIssuanceQueryResolver } from "./resolvers/material-issuance.query.js";
import { MaterialIssuanceMutationResolver } from "./resolvers/material-issuance.mutation.js";
import {
  MaterialIssuanceRelationResolver,
  MaterialIssuanceItemRelationResolver,
} from "./resolvers/material-issuance.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    SectionLoader,
    UserLoader,
    MaterialLoader,
    AreaLoader,
    LocationLoader,
    MaterialInventoryLoader,
    MaterialIssuanceLoader,
    MaterialIssuanceService,
    MaterialIssuanceQueryResolver,
    MaterialIssuanceMutationResolver,
    MaterialIssuanceRelationResolver,
    MaterialIssuanceItemRelationResolver,
  ],
  exports: [MaterialIssuanceService, MaterialIssuanceLoader],
})
export class MaterialIssuanceModule {}
