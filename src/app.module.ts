import { UnitOfMeasurementModule } from './modules/unit-of-measurement/unit-of-measurement.module.js';
import { MouldItemModule } from './modules/mould-item/mould-item.module.js';
import { MaterialSupplierModule } from './modules/material-supplier/material-supplier.module.js';
import { MachineToolModule } from './modules/machine-tool/machine-tool.module.js';
import { FabRouteMachiningModule } from './modules/fab-route-machining/fab-route-machining.module.js';
import { FabRouteIterationModule } from './modules/fab-route-iteration/fab-route-iteration.module.js';
import { FabRouteParameterModule } from './modules/fab-route-parameter/fab-route-parameter.module.js';
import { FabRouteStepModule } from './modules/fab-route-step/fab-route-step.module.js';
import { FabRouteModule } from './modules/fab-route/fab-route.module.js';
import { ItemRouteMachiningModule } from './modules/item-route-machining/item-route-machining.module.js';
import { ItemRouteIterationModule } from './modules/item-route-iteration/item-route-iteration.module.js';
import { ItemRouteParameterModule } from './modules/item-route-parameter/item-route-parameter.module.js';
import { ItemRouteStepModule } from './modules/item-route-step/item-route-step.module.js';
import { ItemRouteModule } from './modules/item-route/item-route.module.js';
import { DefaultRouteMachiningModule } from './modules/default-route-machining/default-route-machining.module.js';
import { DefaultRouteIterationModule } from './modules/default-route-iteration/default-route-iteration.module.js';
import { DefaultRouteParameterModule } from './modules/default-route-parameter/default-route-parameter.module.js';
import { DefaultRouteStepModule } from './modules/default-route-step/default-route-step.module.js';
import { DefaultRouteModule } from './modules/default-route/default-route.module.js';
import { ProcessMachiningModule } from './modules/process-machining/process-machining.module.js';
import { ProcessIterationModule } from './modules/process-iteration/process-iteration.module.js';
import { FabricationModule } from './modules/fabrication/fabrication.module.js';
import { ItemRevisionModule } from './modules/item-revision/item-revision.module.js';
import { ItemPictureModule } from './modules/item-picture/item-picture.module.js';
import { ItemModule } from './modules/item/item.module.js';
import { ParameterModule } from './modules/parameter/parameter.module.js';
import { ProcessModule } from './modules/process/process.module.js';
import { MouldModule } from './modules/mould/mould.module.js';
import { MouldTypeModule } from './modules/mould-type/mould-type.module.js';
import { ItemTypeModule } from './modules/item-type/item-type.module.js';
import { MeltingModule } from './modules/melting/melting.module.js';
import { RawMaterialRotationModule } from './modules/raw-material-rotation/raw-material-rotation.module.js';
import { MaterialGroupModule } from './modules/material-group/material-group.module.js';
import { RawMaterialModule } from './modules/raw-material/raw-material.module.js';
import { ToolModule } from './modules/tool/tool.module.js';
import { MachineModule } from './modules/machine/machine.module.js';
import { MachineTypeModule } from './modules/machine-type/machine-type.module.js';
import { LocationModule } from './modules/location/location.module.js';
import { AreaModule } from './modules/area/area.module.js';
import { BoxTypeModule } from './modules/box-type/box-type.module.js';
import { PalletTypeModule } from './modules/pallet-type/pallet-type.module.js';
import { ShipmentTypeModule } from './modules/shipment-type/shipment-type.module.js';
import { SupplierModule } from './modules/supplier/supplier.module.js';
import { CustomerModule } from './modules/customer/customer.module.js';
import { HolidayModule } from './modules/holiday/holiday.module.js';
import { PositionModule } from './modules/position/position.module.js';
import { SectionModule } from './modules/section/section.module.js';
import { StatusCodeModule } from './modules/status-code/status-code.module.js';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/index.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthService } from './auth/services/auth.service.js';
import { NotificationModule } from './notification/notification.module.js';
import { EventsModule } from './events/events.module.js';
import { UserModule } from './modules/user/user.module.js';
import { StorageModule } from './storage/storage.module.js';
import { HealthModule } from './health/health.module.js';
import { JavaServiceModule } from './java-service/java-service.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    JavaServiceModule,
    AuthModule,
    NotificationModule,
    EventsModule,
    UserModule,
    StorageModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (authService: AuthService) => ({
        typePaths: ['./**/*.graphql'],
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
        context: async ({ req, res }: { req: any; res: any }) => {
          let user = undefined;
          const authHeader = req.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            user =
              (await authService.validateUserFromToken(token)) ?? undefined;
          }
          req.user = user;
          return { req, res, user };
        },
      }),
    }),
    StatusCodeModule,
    SectionModule,
    PositionModule,
    HolidayModule,
    CustomerModule,
    SupplierModule,
    ShipmentTypeModule,
    PalletTypeModule,
    BoxTypeModule,
    AreaModule,
    LocationModule,
    MachineTypeModule,
    MachineModule,
    ToolModule,
    RawMaterialModule,
    MaterialGroupModule,
    RawMaterialRotationModule,
    MeltingModule,
    ItemTypeModule,
    MouldTypeModule,
    MouldModule,
    ProcessModule,
    ParameterModule,
    ItemModule,
    ItemPictureModule,
    ItemRevisionModule,
    FabricationModule,
    ProcessIterationModule,
    ProcessMachiningModule,
    DefaultRouteModule,
    DefaultRouteStepModule,
    DefaultRouteParameterModule,
    DefaultRouteIterationModule,
    DefaultRouteMachiningModule,
    ItemRouteModule,
    ItemRouteStepModule,
    ItemRouteParameterModule,
    ItemRouteIterationModule,
    ItemRouteMachiningModule,
    FabRouteModule,
    FabRouteStepModule,
    FabRouteParameterModule,
    FabRouteIterationModule,
    FabRouteMachiningModule,
    MachineToolModule,
    MaterialSupplierModule,
    MouldItemModule,
    UnitOfMeasurementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
