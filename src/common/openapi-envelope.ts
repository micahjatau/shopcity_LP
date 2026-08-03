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
    ApiBadRequestResponse(errorResponseOptions(400, options.badRequest)),
    ApiUnauthorizedResponse(errorResponseOptions(401, options.unauthorized)),
    ApiForbiddenResponse(errorResponseOptions(403, options.forbidden)),
    ApiNotFoundResponse(errorResponseOptions(404, options.notFound)),
    ApiConflictResponse(errorResponseOptions(409, options.conflict)),
    ApiTooManyRequestsResponse(
      errorResponseOptions(429, options.tooManyRequests),
    ),
    ApiUnprocessableEntityResponse(
      errorResponseOptions(422, options.unprocessableEntity),
    ),
    ApiServiceUnavailableResponse(
      errorResponseOptions(503, options.serviceUnavailable),
    ),
  );
}

function errorResponseOptions(
  status: number,
  examples?: ErrorEnvelopeResponseExamples,
) {
  const schema = errorEnvelopeSchema(status);

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

function errorEnvelopeSchema(statusCode: number) {
  const example = errorExampleForStatus(statusCode);

  return {
    type: 'object',
    required: ['success', 'error', 'meta'],
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        required: ['statusCode', 'code', 'message'],
        properties: {
          statusCode: { type: 'integer', example: example.statusCode },
          code: { type: 'string', example: example.code },
          message: { type: 'string', example: example.message },
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

function errorExampleForStatus(statusCode: number): ErrorEnvelopeExample {
  switch (statusCode) {
    case 400:
      return {
        statusCode,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      };
    case 401:
      return {
        statusCode,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      };
    case 403:
      return {
        statusCode,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      };
    case 404:
      return {
        statusCode,
        code: 'NOT_FOUND',
        message: 'Not found',
      };
    case 409:
      return {
        statusCode,
        code: 'CONFLICT',
        message: 'Conflict',
      };
    case 422:
      return {
        statusCode,
        code: 'POLICY_VIOLATION',
        message: 'Policy violation',
      };
    case 429:
      return {
        statusCode,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      };
    case 503:
      return {
        statusCode,
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Required dependency is unavailable',
      };
    default:
      return {
        statusCode,
        code: `HTTP_${statusCode}`,
        message: 'Request failed',
      };
  }
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
