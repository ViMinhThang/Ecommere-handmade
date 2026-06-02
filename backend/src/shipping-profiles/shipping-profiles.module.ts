import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingProfilesController } from './shipping-profiles.controller';
import { ShippingProfilesService } from './shipping-profiles.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingProfilesController],
  providers: [ShippingProfilesService],
  exports: [ShippingProfilesService],
})
export class ShippingProfilesModule {}
