import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiResponse } from '@nestjs/swagger';
import { ERROR_EXAMPLES, ErrorExample, ErrorExampleKey } from '../constants/error-examples';
import { ErrorResponseDto } from '../dto/error-response.dto';

const STATUS_DESCRIPTIONS: Record<number, string> = {
  400: 'Request tidak valid',
  401: 'Tidak terautentikasi',
  403: 'Tidak punya akses',
  404: 'Data tidak ditemukan',
  409: 'Konflik dengan data yang ada',
  422: 'Request valid tapi tidak bisa diproses',
  500: 'Kesalahan server',
  503: 'Layanan belum tersedia',
};

/**
 * Dokumentasi Swagger untuk response error. Contoh dengan status yang sama digabung dalam satu response.
 * Contoh: @ApiErrorResponses('VALIDATION_ERROR', 'PRODUCT_NOT_FOUND')
 */
export function ApiErrorResponses(...keys: ErrorExampleKey[]) {
  const byStatus = new Map<number, ErrorExampleKey[]>();
  for (const key of keys) {
    const { status } = ERROR_EXAMPLES[key];
    byStatus.set(status, [...(byStatus.get(status) ?? []), key]);
  }

  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ...[...byStatus].map(([status, statusKeys]) =>
      ApiResponse({
        status,
        description: STATUS_DESCRIPTIONS[status],
        type: ErrorResponseDto,
        examples: Object.fromEntries(
          statusKeys.map((key) => {
            const { code, summary, message, details }: ErrorExample = ERROR_EXAMPLES[key];
            return [key, { summary, value: { error: { code, message, ...(details ? { details } : {}) } } }];
          }),
        ),
      }),
    ),
  );
}

/** Untuk controller yang butuh login: bearer auth + 401, 403, dan 500 di semua endpoint-nya. */
export function ApiProtected() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiErrorResponses('UNAUTHORIZED', 'FORBIDDEN', 'INTERNAL_SERVER_ERROR'),
  );
}
