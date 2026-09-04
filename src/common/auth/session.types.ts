import { Branch, Session, Tenant, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export type AuthUser = User & {
  tenant?: Pick<Tenant, 'id' | 'status'> | null;
  branch?: Pick<Branch, 'id' | 'status'> | null;
};

// Keep the newly-added smoke marker optional at the application boundary so
// unit fixtures and pre-migration records remain valid during rollout.
export type AuthSession = Omit<Session, 'smokeMaxLifetimeMs'> & {
  smokeMaxLifetimeMs?: number | null;
};

export interface AuthContext {
  session: AuthSession;
  user: AuthUser;
}

export interface AuthenticatedRequest extends FastifyRequest {
  authContext?: AuthContext;
  authTransport?: 'bearer' | 'cookie';
}
