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
    const checks: Record<string, any> = { api: 'healthy' };
    const t0 = Date.now();

    // 1. Check Database
    try {
      const dbT = Date.now();
      await this.db.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latencyMs: Date.now() - dbT };
    } catch {
      checks.database = { status: 'unhealthy' };
    }

    // 2. Check Redis connection + latency
    try {
      const redisT = Date.now();
      await this.redis.set('health:check', 'ok', 5);
      checks.redis = { status: 'healthy', latencyMs: Date.now() - redisT };
    } catch {
      checks.redis = { status: 'unhealthy' };
    }

    // 3. Check Typesense search engine
    try {
      const isTypesenseHealthy = await this.typesense.health();
      checks.typesense = {
        status: isTypesenseHealthy ? 'healthy' : 'healthy_degraded',
      };
    } catch {
      checks.typesense = { status: 'unhealthy' };
    }

    const allHealthy = Object.entries(checks).every(([key, val]) => {
      const status = typeof val === 'string' ? val : val.status;
      if (key === 'typesense' && status === 'healthy_degraded') return true;
      return status === 'healthy';
    });

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      totalLatencyMs: Date.now() - t0,
      memory: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
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
