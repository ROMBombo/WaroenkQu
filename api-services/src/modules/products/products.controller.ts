import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../../common/constants/permission-code.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiDataResponse, ApiResponseBody, ok } from '../../common/dto/api-response';
import { PaginationMetaDto, PaginationQueryDto, paginationMeta } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { uuidPipe } from '../../common/pipes/validation.pipe';
import { toIsoJakarta } from '../../common/utils/datetime.util';
import { Product } from '../../database/entities';
import { CatalogService } from '../catalog/catalog.service';
import {
  CreateProductDto,
  ListProductsQueryDto,
  StockInDto,
  StockOutDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/product-request.dto';
import {
  DeletedProductResponseDto,
  EffectiveAtMetaDto,
  ProductHistoryResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { toProductHistoryResponse, toProductResponse } from './product.mapper';
import { ProductsService } from './products.service';

type ProductResponse = ApiResponseBody<ProductResponseDto>;
type EffectiveProductResponse<T = ProductResponseDto> = ApiResponseBody<T, EffectiveAtMetaDto>;

@ApiTags('Product Management (Owner)')
@ApiBearerAuth()
@Controller('v1/product-management')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly catalogService: CatalogService,
  ) {}

  @Post()
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Menambah produk (berlaku di kasir setelah publish berikutnya)' })
  @ApiDataResponse(ProductResponseDto, { status: HttpStatus.CREATED, meta: EffectiveAtMetaDto })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser): Promise<EffectiveProductResponse> {
    return this.withEffectiveAt(await this.productsService.create(dto, user));
  }

  @Get()
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'List produk yang belum dihapus' })
  @ApiDataResponse(ProductResponseDto, { paginated: true })
  async findAll(@Query() query: ListProductsQueryDto): Promise<ApiResponseBody<ProductResponseDto[], PaginationMetaDto>> {
    const [products, total] = await this.productsService.findAll(query);
    return ok(products.map(toProductResponse), paginationMeta(query, total));
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'Detail produk' })
  @ApiDataResponse(ProductResponseDto)
  async findOne(@Param('id', uuidPipe) id: string): Promise<ProductResponse> {
    return ok(toProductResponse(await this.productsService.findOne(id)));
  }

  @Put(':id')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Mengubah nama, harga, dan stok minimum' })
  @ApiDataResponse(ProductResponseDto, { meta: EffectiveAtMetaDto })
  async update(
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EffectiveProductResponse> {
    return this.withEffectiveAt(await this.productsService.update(id, dto, user));
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.PRODUCT_DELETE)
  @ApiOperation({ summary: 'Menghapus produk (soft delete)' })
  @ApiDataResponse(DeletedProductResponseDto, { meta: EffectiveAtMetaDto })
  async remove(
    @Param('id', uuidPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<EffectiveProductResponse<DeletedProductResponseDto>> {
    const product = await this.productsService.remove(id, user);
    return ok(
      { id: product.id, deleted_at: toIsoJakarta(product.deletedAt as Date) },
      { effective_at: toIsoJakarta(await this.catalogService.getNextPublishAt()) },
    );
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.PRODUCT_STATUS_UPDATE)
  @ApiOperation({ summary: 'Mengaktifkan atau menonaktifkan produk' })
  @ApiDataResponse(ProductResponseDto, { meta: EffectiveAtMetaDto })
  async updateStatus(
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EffectiveProductResponse> {
    return this.withEffectiveAt(await this.productsService.updateStatus(id, dto, user));
  }

  @Post(':id/stock-in')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.PRODUCT_STOCK_UPDATE)
  @ApiOperation({ summary: 'Menambah stok (langsung berlaku)' })
  @ApiDataResponse(ProductResponseDto)
  async stockIn(
    @Param('id', uuidPipe) id: string,
    @Body() dto: StockInDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ProductResponse> {
    return ok(toProductResponse(await this.productsService.stockIn(id, dto, user)));
  }

  @Post(':id/stock-out')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.PRODUCT_STOCK_UPDATE)
  @ApiOperation({ summary: 'Mengurangi stok (langsung berlaku, ditolak kalau hasilnya negatif)' })
  @ApiDataResponse(ProductResponseDto)
  async stockOut(
    @Param('id', uuidPipe) id: string,
    @Body() dto: StockOutDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ProductResponse> {
    return ok(toProductResponse(await this.productsService.stockOut(id, dto, user)));
  }

  @Get(':id/history')
  @RequirePermissions(PermissionCode.PRODUCT_HISTORY_READ)
  @ApiOperation({ summary: 'History perubahan produk (termasuk produk yang sudah dihapus)' })
  @ApiDataResponse(ProductHistoryResponseDto, { paginated: true })
  async findHistory(
    @Param('id', uuidPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ApiResponseBody<ProductHistoryResponseDto[], PaginationMetaDto>> {
    const [histories, total] = await this.productsService.findHistory(id, query);
    return ok(histories.map(toProductHistoryResponse), paginationMeta(query, total));
  }

  private async withEffectiveAt(product: Product): Promise<EffectiveProductResponse> {
    return ok(toProductResponse(product), {
      effective_at: toIsoJakarta(await this.catalogService.getNextPublishAt()),
    });
  }
}
