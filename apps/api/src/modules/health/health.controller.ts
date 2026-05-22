import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { TypesenseService } from '../typesense/typesense.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly typesense: TypesenseService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Aggregated health check of API and core dependencies' })
  async check() {
    const checks: Record<string, string> = { api: 'healthy' };

    // 1. Check Database
    try {
      await this.db.$queryRaw`SELECT 1`;
      checks.database = 'healthy';
    } catch {
      checks.database = 'unhealthy';
    }

    // 2. Check Redis connection
    try {
      await this.redis.set('health:check', 'ok', 5);
      checks.redis = 'healthy';
    } catch {
      checks.redis = 'unhealthy';
    }

    // 3. Check Typesense search engine
    try {
      const isTypesenseHealthy = await this.typesense.health();
      checks.typesense = isTypesenseHealthy ? 'healthy' : 'healthy_degraded'; // Degrades gracefully
    } catch {
      checks.typesense = 'unhealthy';
    }

    const allHealthy = Object.entries(checks).every(([key, status]) => {
      // Graceful degradation for typesense_degraded does not crash health check
      if (key === 'typesense' && status === 'healthy_degraded') return true;
      return status === 'healthy';
    });

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for container orchestrators' })
  async readiness() {
    // A simple endpoint to confirm the container is listening and ready to accept traffic
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness check for container orchestrators' })
  async liveness() {
    // A simple endpoint to confirm process liveness (avoiding circular dependency checks)
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}
