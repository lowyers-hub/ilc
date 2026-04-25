import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiAuditService } from './ai-audit.service';

@Injectable()
export class AiMonitoringService {
  private readonly logger = new Logger(AiMonitoringService.name);

  // Thresholds for triggering alerts
  private readonly MAX_HALLUCINATION_RATE = 0.10; // 10%
  private readonly MIN_CORRECTNESS_SCORE = 0.80; // 80%

  constructor(private readonly audits: AiAuditService) {}

  @Cron(CronExpression.EVERY_HOUR) // Run every hour
  async handlePeriodicCheck() {
    this.logger.log('Starting AI observability monitoring check...');

    // Define the time window for the check (e.g., last 24 hours)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    try {
      const [hallucinationRate, correctnessTrend, escalationRate] = await Promise.all([
        this.audits.getHallucinationRate(startDate, endDate),
        this.audits.getCorrectnessTrend(startDate, endDate),
        this.audits.getEscalationRate(startDate, endDate)
      ]);

      this.logger.log(`Metrics (Last 24h) | Hallucination: ${(hallucinationRate * 100).toFixed(1)}% | Correctness: ${(correctnessTrend * 100).toFixed(1)}% | Escalation: ${(escalationRate * 100).toFixed(1)}%`);

      // Trigger Alerts
      if (hallucinationRate > this.MAX_HALLUCINATION_RATE) {
        this.triggerAlert(`CRITICAL: Hallucination rate has spiked to ${(hallucinationRate * 100).toFixed(1)}%. Threshold is ${(this.MAX_HALLUCINATION_RATE * 100).toFixed(1)}%.`);
      }

      if (correctnessTrend < this.MIN_CORRECTNESS_SCORE && correctnessTrend > 0) { // > 0 check to ignore periods with no evaluations
        this.triggerAlert(`WARNING: Correctness trend has dropped to ${(correctnessTrend * 100).toFixed(1)}%. Minimum acceptable is ${(this.MIN_CORRECTNESS_SCORE * 100).toFixed(1)}%.`);
      }

    } catch (error: any) {
      this.logger.error('Failed to run AI monitoring check', error.stack);
    }
  }

  private triggerAlert(message: string) {
    // In a real production system, this would integrate with Slack, PagerDuty, or email
    this.logger.error(`[ALERT] ${message}`);
  }
}