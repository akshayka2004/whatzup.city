import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'typesense';

@Injectable()
export class TypesenseService implements OnModuleInit {
  private readonly logger = new Logger(TypesenseService.name);
  private client: Client;
  private isEnabled: boolean = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get('TYPESENSE_HOST');
    const apiKey = this.config.get('TYPESENSE_API_KEY');

    if (host && apiKey) {
      this.client = new Client({
        nodes: [
          {
            host,
            port: this.config.get<number>('TYPESENSE_PORT', 8108),
            protocol: this.config.get('TYPESENSE_PROTOCOL', 'http'),
          },
        ],
        apiKey,
        connectionTimeoutSeconds: 2,
      });
      this.isEnabled = true;
      this.logger.log('Typesense client initialized successfully.');
      this.initSchemas().catch((err) => this.logger.error('Failed to init Typesense schemas', err));
    } else {
      this.logger.warn(
        'Typesense configuration missing. Search will gracefully degrade to Postgres (Fallback).',
      );
    }
  }

  /** Full field list for the businesses collection */
  static readonly BUSINESS_FIELDS = [
    { name: 'id', type: 'string' },
    { name: 'tenantId', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'categoryId', type: 'string' },
    { name: 'categoryName', type: 'string', optional: true },
    { name: 'subcategoryName', type: 'string', optional: true },
    { name: 'tags', type: 'string[]', optional: true },
    { name: 'branchNames', type: 'string', optional: true },
    { name: 'offerTitles', type: 'string', optional: true },
    { name: 'productNames', type: 'string', optional: true },
    { name: 'city', type: 'string', facet: true, optional: true },
    { name: 'location', type: 'geopoint', optional: true },
    { name: 'averageRating', type: 'float', optional: true },
    { name: 'totalReviews', type: 'int32', optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'createdAt', type: 'int64' },
  ] as const;

  private async initSchemas() {
    const businessSchema = {
      name: 'businesses',
      fields: TypesenseService.BUSINESS_FIELDS,
      default_sorting_field: 'createdAt',
    };

    try {
      await this.client.collections('businesses').retrieve();
      // Collection exists — add any missing optional fields (graceful migration)
      const newOptionalFields = ['subcategoryName', 'tags', 'branchNames', 'offerTitles', 'productNames'];
      try {
        await this.client.collections('businesses').update({
          fields: newOptionalFields.map((name) =>
            name === 'tags'
              ? { name, type: 'string[]', optional: true }
              : { name, type: 'string', optional: true },
          ),
        } as any);
        this.logger.log('Typesense businesses schema migrated with new search fields.');
      } catch (_) {
        // Fields may already exist — ignore errors
      }
    } catch (e) {
      await this.client.collections().create(businessSchema as any);
      this.logger.log('Typesense businesses schema created.');
    }
  }

  async indexDocument(collection: string, document: any) {
    if (!this.isEnabled) return;
    try {
      await this.client.collections(collection).documents().upsert(document);
    } catch (error) {
      this.logger.error(`Error indexing document into ${collection}`, error);
    }
  }

  async removeDocument(collection: string, id: string) {
    if (!this.isEnabled) return;
    try {
      await this.client.collections(collection).documents(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting document ${id} from ${collection}`, error);
    }
  }

  async search(collection: string, searchParameters: any) {
    if (!this.isEnabled) return null;
    return this.client.collections(collection).documents().search(searchParameters);
  }

  async hasDocuments(collection: string): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const res = await this.client.collections(collection).documents().search({ q: '*', per_page: 0 });
      return res.found > 0;
    } catch {
      return false;
    }
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  async health(): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const res = await this.client.health.retrieve();
      return res.ok;
    } catch {
      return false;
    }
  }
}
