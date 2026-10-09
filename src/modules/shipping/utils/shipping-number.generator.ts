import { SHIPPING_RULES } from "../rules/shipping.rules.js";

export class ShippingNumberGenerator {
  private static MONTH_MAP: Record<number, string> = {
    0: "A", // Jan
    1: "B", // Feb
    2: "C", // Mar
    3: "D", // Apr
    4: "E", // May
    5: "F", // Jun
    6: "G", // Jul
    7: "H", // Aug
    8: "I", // Sep
    9: "J", // Oct
    10: "K", // Nov
    11: "L", // Dec
  };

  /**
   * Generates 12-digit Box No
   * e.g. P26J09010001 (Country P, Year 26, Month J, Day 09, DailySeries 01, BoxSeq 0001)
   */
  static generateBoxNo(params: {
    date: Date;
    shipmentDailySeries: number;
    boxIndex: number;
    countryCode?: string;
  }): string {
    const country = (params.countryCode || SHIPPING_RULES.DEFAULT_COUNTRY_CODE).substring(0, 1).toUpperCase();
    const yearStr = String(params.date.getFullYear()).slice(-2);
    const monthChar = this.MONTH_MAP[params.date.getMonth()] || "A";
    const dayStr = String(params.date.getDate()).padStart(2, "0");
    const shipmentSeriesStr = String(params.shipmentDailySeries).padStart(2, "0");
    const boxSeriesStr = String(params.boxIndex).padStart(4, "0");

    return `${country}${yearStr}${monthChar}${dayStr}${shipmentSeriesStr}${boxSeriesStr}`;
  }

  /**
   * Generates Pallet No (Sequence only, e.g. P1, P2, ... P30)
   */
  static generatePalletNo(params: {
    sequenceNo: number;
    prefix?: string;
    withPrefix?: boolean;
    date?: Date;
    shipmentDailySeries?: number;
  }): string {
    let prefix = "P";
    if (params.withPrefix === false) {
      prefix = "";
    } else if (params.prefix !== undefined) {
      prefix = params.prefix;
    }

    return `${prefix}${params.sequenceNo}`;
  }

  /**
   * Generates continuous Annual Invoice No
   * e.g. CE-26-S-0001, CE-26-A-0001, CE-26-S-001S
   */
  static generateInvoiceNo(params: {
    year: number;
    freightType: string;
    annualSeries: number;
    suffix?: string;
  }): string {
    const yearStr = String(params.year).slice(-2);
    const freightUpper = params.freightType.toUpperCase();
    const freightCode = freightUpper.startsWith("A") ? "A" : freightUpper.startsWith("L") ? "L" : "S";
    const seriesStr = String(params.annualSeries).padStart(4, "0");
    const suffix = params.suffix ? params.suffix : "";

    return `CE-${yearStr}-${freightCode}-${seriesStr}${suffix}`;
  }

  /**
   * Generates Shipment No
   * e.g. SHP-20261009-001
   */
  static generateShipmentNo(params: {
    date: Date;
    dailySeries: number;
  }): string {
    const yyyy = params.date.getFullYear();
    const mm = String(params.date.getMonth() + 1).padStart(2, "0");
    const dd = String(params.date.getDate()).padStart(2, "0");
    const series = String(params.dailySeries).padStart(3, "0");

    return `SHP-${yyyy}${mm}${dd}-${series}`;
  }
}
