import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../../common/constants/permission-code.enum';
import { ApiErrorResponses, ApiProtected } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiDataResponse, ApiResponseBody, ok } from '../../common/dto/api-response';
import { toIsoJakarta } from '../../common/utils/datetime.util';
import { CatalogService } from './catalog.service';
import { CurrentCatalogResponseDto } from './dto/catalog-response.dto';

@ApiTags('Catalog (Kasir)')
@ApiProtected()
@Controller('v1/catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @RequirePermissions(PermissionCode.CATALOG_READ)
  @ApiOperation({ summary: 'Katalog yang berlaku saat ini (dari Redis)' })
  @ApiErrorResponses('CATALOG_NOT_AVAILABLE')
  @ApiDataResponse(CurrentCatalogResponseDto)
  async getCurrent(): Promise<ApiResponseBody<CurrentCatalogResponseDto>> {
    const catalog = await this.catalogService.getCurrentOrFail();
    // min_stock hanya untuk API Services, tidak dikirim ke kasir
    return ok({
      catalog_publish_id: catalog.catalog_publish_id,
      published_at: toIsoJakarta(new Date(catalog.published_at)),
      products: catalog.products.map(({ id, name, price }) => ({ id, name, price })),
    });
  }
}
