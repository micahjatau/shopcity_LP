import { Branch, Session, Tenant, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export type AuthUser = User & {
  tenant?: Pick<Tenant, 'id' | 'status'> | null;
  branch?: Pick<Branch, 'id' | 'status'> | null;
};

export interface AuthContext {
  session: Session;
  user: AuthUser;
}

export interface AuthenticatedRequest extends FastifyRequest {
  authContext?: AuthContext;
  authTransport?: 'bearer' | 'cookie';
}
