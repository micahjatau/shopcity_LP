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

export function apiErrorEnvelopeResponses() {
  return applyDecorators(
    ApiBadRequestResponse({ schema: errorEnvelopeSchema() }),
    ApiUnauthorizedResponse({ schema: errorEnvelopeSchema() }),
    ApiForbiddenResponse({ schema: errorEnvelopeSchema() }),
    ApiNotFoundResponse({ schema: errorEnvelopeSchema() }),
    ApiConflictResponse({ schema: errorEnvelopeSchema() }),
    ApiUnprocessableEntityResponse({ schema: errorEnvelopeSchema() }),
    ApiServiceUnavailableResponse({ schema: errorEnvelopeSchema() }),
  );
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
          details: { nullable: true },
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
