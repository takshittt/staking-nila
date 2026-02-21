/**
 * Helper functions for handling decimal values stored as strings in MongoDB
 */

export class DecimalHelper {
  /**
   * Convert number to string for database storage
   */
  static toString(value: number | string): string {
    return typeof value === 'number' ? value.toString() : value;
  }

  /**
   * Convert string from database to number
   */
  static toNumber(value: string | number): number {
    return typeof value === 'string' ? parseFloat(value) : value;
  }

  /**
   * Parse float safely
   */
  static parseFloat(value: string | number): number {
    return typeof value === 'string' ? parseFloat(value) : value;
  }

  /**
   * Sum an array of string decimal values
   */
  static sum(values: string[]): number {
    return values.reduce((sum, val) => sum + parseFloat(val), 0);
  }

  /**
   * Format for display with fixed decimals
   */
  static toFixed(value: string | number, decimals: number = 2): string {
    const num = this.toNumber(value);
    return num.toFixed(decimals);
  }
}
