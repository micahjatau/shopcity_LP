import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

@Injectable()
export class AppService {
  constructor(private readonly supabaseService: SupabaseService) {}

  getHello(): string {
    return this.supabaseService.publicClient
      ? 'ShopCity backend foundation is ready'
      : 'ShopCity backend is starting';
  }

  getSupabaseReady(): boolean {
    return Boolean(this.supabaseService.publicClient);
  }
}
