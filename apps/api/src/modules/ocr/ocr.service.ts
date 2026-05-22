import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Extract text from an image buffer or URL
   */
  async extractText(imageUrlOrBuffer: string | Buffer): Promise<{
    text: string;
    confidence: number;
    parsedData: any;
  }> {
    this.logger.debug('Starting OCR extraction...');
    try {
      const { data } = await Tesseract.recognize(
        imageUrlOrBuffer,
        'eng',
        { logger: (m) => this.logger.verbose(m) }, // Optional: logs progress
      );

      const parsedData = this.parseExtractedText(data.text);

      return {
        text: data.text,
        confidence: data.confidence,
        parsedData,
      };
    } catch (error) {
      this.logger.error(`OCR Extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simple regex-based parsing to find amounts, dates, and potential invoice numbers
   */
  private parseExtractedText(rawText: string): any {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Naive Amount extraction (e.g., $100.00, Rs. 500, 1,200.50)
    const amounts = rawText.match(/(?:[$£€₹]?\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g) || [];

    // Naive Date extraction
    const dates = rawText.match(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g) || [];

    // Naive Invoice number extraction
    const invoiceRegex = /(?:invoice|bill|receipt|no|num)(?:[\s#.:-]*)([a-zA-Z0-9-]{4,})/i;
    const invoiceMatch = rawText.match(invoiceRegex);
    const invoiceNumber = invoiceMatch ? invoiceMatch[1] : null;

    return {
      possibleAmounts: amounts,
      highestAmount: this.findHighestAmount(amounts),
      possibleDates: dates,
      invoiceNumber,
      lineCount: lines.length,
    };
  }

  private findHighestAmount(amounts: string[]): number | null {
    if (amounts.length === 0) return null;
    const numericAmounts = amounts
      .map((a) => parseFloat(a.replace(/[^0-9.]/g, '')))
      .filter((a) => !isNaN(a));
    if (numericAmounts.length === 0) return null;
    return Math.max(...numericAmounts);
  }
}
