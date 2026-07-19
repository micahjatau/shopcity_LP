import { Session, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export interface AuthContext {
  session: Session;
  user: User;
}

export interface AuthenticatedRequest extends FastifyRequest {
  authContext?: AuthContext;
}
