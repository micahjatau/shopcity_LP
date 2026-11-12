import { Branch, Session, Tenant, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';

// Keep newly added profile fields optional at the auth-context boundary so
// existing session fixtures and pre-migration records remain valid. Staff
// profile reads use an explicit tenant-scoped selection in UsersService.
export type AuthUser = Omit<User, 'firstName' | 'lastName' | 'phoneNumber'> & {
  firstName?: User['firstName'];
  lastName?: User['lastName'];
  phoneNumber?: User['phoneNumber'];
  tenant?: Pick<Tenant, 'id' | 'status'> | null;
  branch?: Pick<Branch, 'id' | 'status'> | null;
};

// Keep the newly-added smoke marker optional at the application boundary so
// unit fixtures and pre-migration records remain valid during rollout.
export type AuthSession = Omit<Session, 'purpose'> & {
  purpose?: Session['purpose'];
};

export interface AuthContext {
  session: AuthSession;
  user: AuthUser;
}

export interface AuthenticatedRequest extends FastifyRequest {
  authContext?: AuthContext;
  authTransport?: 'bearer' | 'cookie';
}
