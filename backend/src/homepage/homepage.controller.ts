import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CreateHomepageBannerDto } from './dto/create-homepage-banner.dto';
import { CreateHomepageFeaturedProductDto } from './dto/create-homepage-featured-product.dto';
import { UpdateHomepageBannerDto } from './dto/update-homepage-banner.dto';
import { UpdateHomepageFeaturedProductDto } from './dto/update-homepage-featured-product.dto';
import { HomepageService } from './homepage.service';

@Controller('homepage')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  getHomepage() {
    return this.homepageService.getPublicHomepage();
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/homepage')
export class AdminHomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get('banners')
  @Roles('ROLE_ADMIN')
  listBanners() {
    return this.homepageService.listAdminBanners();
  }

  @Post('banners')
  @Roles('ROLE_ADMIN')
  createBanner(@Body() data: CreateHomepageBannerDto) {
    return this.homepageService.createBanner(data);
  }

  @Patch('banners/:id')
  @Roles('ROLE_ADMIN')
  updateBanner(@Param('id') id: string, @Body() data: UpdateHomepageBannerDto) {
    return this.homepageService.updateBanner(id, data);
  }

  @Delete('banners/:id')
  @Roles('ROLE_ADMIN')
  deleteBanner(@Param('id') id: string) {
    return this.homepageService.deleteBanner(id);
  }

  @Get('featured-products')
  @Roles('ROLE_ADMIN')
  listFeaturedProducts() {
    return this.homepageService.listAdminFeaturedProducts();
  }

  @Post('featured-products')
  @Roles('ROLE_ADMIN')
  createFeaturedProduct(@Body() data: CreateHomepageFeaturedProductDto) {
    return this.homepageService.createFeaturedProduct(data);
  }

  @Patch('featured-products/:id')
  @Roles('ROLE_ADMIN')
  updateFeaturedProduct(
    @Param('id') id: string,
    @Body() data: UpdateHomepageFeaturedProductDto,
  ) {
    return this.homepageService.updateFeaturedProduct(id, data);
  }

  @Delete('featured-products/:id')
  @Roles('ROLE_ADMIN')
  deleteFeaturedProduct(@Param('id') id: string) {
    return this.homepageService.deleteFeaturedProduct(id);
  }
}
