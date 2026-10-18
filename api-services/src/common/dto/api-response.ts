import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination.dto';

/** Semua response sukses dibungkus { data, meta? }. */
export interface ApiResponseBody<T, M = undefined> {
  data: T;
  meta?: M;
}

export function ok<T>(data: T): ApiResponseBody<T>;
export function ok<T, M>(data: T, meta: M): ApiResponseBody<T, M>;
export function ok<T, M>(data: T, meta?: M): ApiResponseBody<T, M> {
  return meta === undefined ? { data } : { data, meta };
}

interface ApiDataResponseOptions {
  status?: HttpStatus;
  isArray?: boolean;
  paginated?: boolean;
  meta?: Type<unknown>;
  description?: string;
}

/** Dokumentasi Swagger untuk response { data, meta? }. */
export function ApiDataResponse(model: Type<unknown>, options: ApiDataResponseOptions = {}) {
  const { status = HttpStatus.OK, isArray = false, paginated = false, meta, description } = options;
  const dataSchema = isArray || paginated
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };
  const metaModel = paginated ? PaginationMetaDto : meta;

  return applyDecorators(
    ApiExtraModels(model, ...(metaModel ? [metaModel] : [])),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          data: dataSchema,
          ...(metaModel ? { meta: { $ref: getSchemaPath(metaModel) } } : {}),
        },
      },
    }),
  );
}
