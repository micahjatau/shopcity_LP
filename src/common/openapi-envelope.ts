import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

type EnvelopeDataSchema = {
  type?: string;
  items?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  required?: readonly string[];
  additionalProperties?: boolean | Record<string, unknown>;
  example?: unknown;
};

type EnvelopeResponseOptions = {
  description?: string;
  dataSchema?: EnvelopeDataSchema;
  status?: 200 | 201 | 202;
};

type ErrorEnvelopeExample = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

type ErrorEnvelopeResponseExamples = Record<string, ErrorEnvelopeExample>;

type ErrorEnvelopeResponseOptions = {
  badRequest?: ErrorEnvelopeResponseExamples;
  unauthorized?: ErrorEnvelopeResponseExamples;
  forbidden?: ErrorEnvelopeResponseExamples;
  notFound?: ErrorEnvelopeResponseExamples;
  conflict?: ErrorEnvelopeResponseExamples;
  tooManyRequests?: ErrorEnvelopeResponseExamples;
  unprocessableEntity?: ErrorEnvelopeResponseExamples;
  serviceUnavailable?: ErrorEnvelopeResponseExamples;
};

export function apiSuccessEnvelopeResponse(
  options: EnvelopeResponseOptions = {},
) {
  const responseDecorator =
    options.status === 201
      ? ApiCreatedResponse
      : options.status === 202
        ? ApiAcceptedResponse
        : ApiOkResponse;

  return responseDecorator({
    description: options.description,
    schema: envelopeSchema(options.dataSchema ?? { type: 'object' }) as never,
  });
}

export function apiErrorEnvelopeResponses(
  options: ErrorEnvelopeResponseOptions = {},
) {
  return applyDecorators(
    ApiBadRequestResponse(errorResponseOptions(options.badRequest)),
    ApiUnauthorizedResponse(errorResponseOptions(options.unauthorized)),
    ApiForbiddenResponse(errorResponseOptions(options.forbidden)),
    ApiNotFoundResponse(errorResponseOptions(options.notFound)),
    ApiConflictResponse(errorResponseOptions(options.conflict)),
    ApiTooManyRequestsResponse(errorResponseOptions(options.tooManyRequests)),
    ApiUnprocessableEntityResponse(
      errorResponseOptions(options.unprocessableEntity),
    ),
    ApiServiceUnavailableResponse(
      errorResponseOptions(options.serviceUnavailable),
    ),
  );
}

function errorResponseOptions(examples?: ErrorEnvelopeResponseExamples) {
  const schema = errorEnvelopeSchema();

  if (!examples) {
    return { schema };
  }

  return {
    content: {
      'application/json': {
        schema,
        examples: Object.fromEntries(
          Object.entries(examples).map(([name, error]) => [
            name,
            { value: errorEnvelopeExample(error) },
          ]),
        ),
      },
    },
  };
}

function errorEnvelopeExample(error: ErrorEnvelopeExample) {
  return {
    success: false,
    error,
    meta: {
      timestamp: '2026-07-19T00:00:00.000Z',
      path: '/api/v1/transactions/earn',
      requestId: 'req_example',
    },
  };
}

function envelopeSchema(dataSchema: EnvelopeDataSchema) {
  return {
    type: 'object',
    required: ['success', 'data', 'meta'],
    properties: {
      success: { type: 'boolean', example: true },
      data: dataSchema,
      meta: metaSchema(),
    },
  };
}

function errorEnvelopeSchema() {
  return {
    type: 'object',
    required: ['success', 'error', 'meta'],
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        required: ['statusCode', 'code', 'message'],
        properties: {
          statusCode: { type: 'integer', example: 400 },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
      },
      meta: metaSchema(),
    },
  };
}

function metaSchema() {
  return {
    type: 'object',
    required: ['timestamp', 'path', 'requestId'],
    properties: {
      timestamp: { type: 'string', example: '2026-07-19T00:00:00.000Z' },
      path: { type: 'string', example: '/api/v1' },
      requestId: { type: 'string', example: 'req-123' },
    },
  };
}
