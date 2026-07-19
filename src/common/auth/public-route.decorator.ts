import { SetMetadata } from '@nestjs/common';
import { PUBLIC_ROUTE_KEY } from './auth.constants';

export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
