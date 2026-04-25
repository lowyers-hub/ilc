import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiAuditService } from './ai-audit.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';

@Injectable()
export class AiMonitoringService {
  private readonly logger = new Logger(AiMonitoringService.name);

  // Thresholds for triggering alerts
  private readonly MAX_HALLUCINATION_RATE = 0.10; // 10%
  private readonly MIN_CORRECTNESS_SCORE = 0.80; // 80%

  constructor(
    private readonly audits: AiAuditService,
    private readonly cache: RedisCacheService
  ) {}

  @Cron(CronExpression.EVERY_HOUR) // Run every hour
  async handlePeriodicCheck() {
    this.logger.log('Starting AI observability monitoring check...');

    // Define the time window for the check (e.g., last 24 hours)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    try {
      const categoryMetrics = await this.audits.getMetricsByCategory(startDate, endDate);

      for (const row of categoryMetrics) {
        const category = row.category;
        const hallucinationRate = parseFloat(row.hallucinationRate || '0');
        const correctnessTrend = parseFloat(row.correctnessTrend || '0');
        const escalationRate = parseFloat(row.escalationRate || '0');

        this.logger.log(`Metrics [${category}] (Last 24h) | Hallucination: ${(hallucinationRate * 100).toFixed(1)}% | Correctness: ${(correctnessTrend * 100).toFixed(1)}% | Escalation: ${(escalationRate * 100).toFixed(1)}%`);

        // Store health state for adaptive behaviors per category
        await this.cache.setJson(`ai:health:metrics:${category}`, {
          hallucinationRate,
          correctnessTrend,
          escalationRate,
          updatedAt: new Date().toISOString()
        }, 86400); // 1 day TTL

        // Trigger Alerts
        if (hallucinationRate > this.MAX_HALLUCINATION_RATE) {
          this.triggerAlert(`CRITICAL [${category}]: Hallucination rate spiked to ${(hallucinationRate * 100).toFixed(1)}%.`);
        }

        if (correctnessTrend < this.MIN_CORRECTNESS_SCORE && correctnessTrend > 0) {
          this.triggerAlert(`WARNING [${category}]: Correctness trend dropped to ${(correctnessTrend * 100).toFixed(1)}%.`);
        }
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