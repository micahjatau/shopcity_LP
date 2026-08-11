import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthFailureRuleInput,
  CardReplacementRuleInput,
  FraudFinding,
  FraudReceiptInput,
  ReversalFrequencyRuleInput,
} from './fraud.types';
import { PrismaService } from '../../database/prisma.service';
import { FraudBehaviorRuntime } from '../../jobs/fraud-behavior.runtime';

@Injectable()
export class FraudBehaviorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private runtime(): FraudBehaviorRuntime {
    return new FraudBehaviorRuntime(this.prisma, this.configService);
  }

  evaluateReceiptBehavior(input: FraudReceiptInput): Promise<FraudFinding[]> {
    return this.runtime().evaluateReceiptBehavior(input) as Promise<
      FraudFinding[]
    >;
  }

  evaluateCardReplacementBehavior(
    input: CardReplacementRuleInput,
  ): Promise<FraudFinding[]> {
    return this.runtime().evaluateCardReplacementBehavior(input) as Promise<
      FraudFinding[]
    >;
  }

  evaluateReversalBehavior(
    input: ReversalFrequencyRuleInput,
  ): Promise<FraudFinding[]> {
    return this.runtime().evaluateReversalBehavior(input) as Promise<
      FraudFinding[]
    >;
  }

  evaluateAuthFailures(input: AuthFailureRuleInput): Promise<FraudFinding[]> {
    return this.runtime().evaluateAuthFailures(input) as Promise<
      FraudFinding[]
    >;
  }
}
