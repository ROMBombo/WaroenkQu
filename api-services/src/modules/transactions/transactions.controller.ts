import { Body, Controller, Get, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../../common/constants/permission-code.enum';
import { ApiErrorResponses, ApiProtected } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiDataResponse, ApiResponseBody, ok } from '../../common/dto/api-response';
import { PaginationMetaDto, PaginationQueryDto, paginationMeta } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { uuidPipe } from '../../common/pipes/validation.pipe';
import { CreateTransactionDto } from './dto/transaction-request.dto';
import { TransactionDetailResponseDto, TransactionSummaryResponseDto } from './dto/transaction-response.dto';
import { toTransactionDetail, toTransactionSummary } from './transaction.mapper';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiProtected()
@Controller('v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @RequirePermissions(PermissionCode.TRANSACTION_CREATE)
  @ApiOperation({ summary: 'Membuat transaksi (kasir)' })
  @ApiErrorResponses(
    'VALIDATION_ERROR',
    'DUPLICATE_TRANSACTION_ITEM',
    'PAID_AMOUNT_TOO_LOW',
    'CATALOG_OUTDATED',
    'PRODUCT_NOT_IN_CATALOG',
    'INSUFFICIENT_STOCK_TRANSACTION',
    'CATALOG_NOT_AVAILABLE',
  )
  @ApiDataResponse(TransactionDetailResponseDto, { status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponseBody<TransactionDetailResponseDto>> {
    return ok(toTransactionDetail(await this.transactionsService.create(dto, user)));
  }

  @Get()
  @RequirePermissions(PermissionCode.TRANSACTION_READ)
  @ApiOperation({ summary: 'History transaksi (owner: semua kasir, kasir: milik sendiri)' })
  @ApiErrorResponses('VALIDATION_ERROR')
  @ApiDataResponse(TransactionSummaryResponseDto, { paginated: true })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponseBody<TransactionSummaryResponseDto[], PaginationMetaDto>> {
    const [transactions, total] = await this.transactionsService.findAll(user, query);
    return ok(transactions.map(toTransactionSummary), paginationMeta(query, total));
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.TRANSACTION_READ)
  @ApiOperation({ summary: 'Detail transaksi beserta item-itemnya' })
  @ApiErrorResponses('INVALID_UUID', 'TRANSACTION_NOT_FOUND')
  @ApiDataResponse(TransactionDetailResponseDto)
  async findOne(
    @Param('id', uuidPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponseBody<TransactionDetailResponseDto>> {
    return ok(toTransactionDetail(await this.transactionsService.findOne(id, user)));
  }
}
