import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../../common/constants/permission-code.enum';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiDataResponse, ApiResponseBody, ok } from '../../common/dto/api-response';
import { PaginationMetaDto, PaginationQueryDto, paginationMeta } from '../../common/dto/pagination.dto';
import { uuidPipe } from '../../common/pipes/validation.pipe';
import { CatalogService } from './catalog.service';
import {
  CatalogHistoryDetailResponseDto,
  CatalogHistoryItemResponseDto,
  PublishInfoResponseDto,
} from './dto/catalog-response.dto';

@ApiTags('Catalog Management (Owner)')
@ApiBearerAuth()
@RequirePermissions(PermissionCode.CATALOG_MANAGEMENT_READ)
@Controller('v1/catalog-management')
export class CatalogManagementController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('publish-info')
  @ApiOperation({ summary: 'Waktu publish katalog terakhir dan berikutnya (dd-mm-yyyy hh:mm:ss, UTC+7)' })
  @ApiDataResponse(PublishInfoResponseDto)
  async getPublishInfo(): Promise<ApiResponseBody<PublishInfoResponseDto>> {
    return ok(await this.catalogService.getPublishInfo());
  }

  @Get('history')
  @ApiOperation({ summary: 'List history katalog' })
  @ApiDataResponse(CatalogHistoryItemResponseDto, { paginated: true })
  async listHistory(
    @Query() query: PaginationQueryDto,
  ): Promise<ApiResponseBody<CatalogHistoryItemResponseDto[], PaginationMetaDto>> {
    const { items, total } = await this.catalogService.listHistory(query);
    return ok(items, paginationMeta(query, total));
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'Isi katalog pada satu waktu publish' })
  @ApiDataResponse(CatalogHistoryDetailResponseDto)
  async getHistory(@Param('id', uuidPipe) id: string): Promise<ApiResponseBody<CatalogHistoryDetailResponseDto>> {
    return ok(await this.catalogService.getHistory(id));
  }
}
