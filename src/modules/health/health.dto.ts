export class HealthOkDto {
  status!: 'ok';
  info!: { api: unknown };
}

export class HealthReadyDto {
  status!: 'ok';
  info!: { database: unknown; redis: unknown };
}
