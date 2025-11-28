import type { UnitSystem, Ingredient } from "@/types";

const CONVERSION_FACTORS: Record<string, { metric: string; factor: number }> = {
  lbs: { metric: "kg", factor: 0.453592 },
  lb: { metric: "kg", factor: 0.453592 },
  oz: { metric: "g", factor: 28.3495 },

  cups: { metric: "ml", factor: 236.588 },
  cup: { metric: "ml", factor: 236.588 },
  tbsp: { metric: "ml", factor: 14.787 },
  tsp: { metric: "ml", factor: 4.929 },
  "fl oz": { metric: "ml", factor: 29.5735 },
  quart: { metric: "L", factor: 0.946353 },
  qt: { metric: "L", factor: 0.946353 },
  gallon: { metric: "L", factor: 3.78541 },
  gal: { metric: "L", factor: 3.78541 },
  pint: { metric: "ml", factor: 473.176 },
  pt: { metric: "ml", factor: 473.176 },

  inch: { metric: "cm", factor: 2.54 },
  in: { metric: "cm", factor: 2.54 },
  inches: { metric: "cm", factor: 2.54 },
};

const REVERSE_CONVERSION: Record<string, { imperial: string; factor: number }> = {
  kg: { imperial: "lbs", factor: 2.20462 },
  g: { imperial: "oz", factor: 0.035274 },
  ml: { imperial: "cups", factor: 0.00422675 },
  L: { imperial: "quart", factor: 1.05669 },
  cm: { imperial: "in", factor: 0.393701 },
};

export function fahrenheitToCelsius(f: number): number {
  return Math.round((f - 32) * (5 / 9));
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round(c * (9 / 5) + 32);
}

export function convertTemperature(value: number, toSystem: UnitSystem): number {
  return toSystem === "metric" ? fahrenheitToCelsius(value) : celsiusToFahrenheit(value);
}

export interface ConvertedMeasurement {
  quantity: number;
  unit: string;
}

export function convertUnit(quantity: number, unit: string, toSystem: UnitSystem): ConvertedMeasurement {
  const normalizedUnit = unit.toLowerCase().trim();

  if (toSystem === "metric") {
    const conversion = CONVERSION_FACTORS[normalizedUnit];
    if (conversion) {
      return {
        quantity: roundToNice(quantity * conversion.factor),
        unit: conversion.metric,
      };
    }
  } else {
    const conversion = REVERSE_CONVERSION[normalizedUnit];
    if (conversion) {
      return {
        quantity: roundToNice(quantity * conversion.factor),
        unit: conversion.imperial,
      };
    }
  }

  return { quantity, unit };
}

export function scaleQuantity(quantity: number, originalServings: number, desiredServings: number): number {
  const scaleFactor = desiredServings / originalServings;
  return roundToNice(quantity * scaleFactor);
}

export function scaleIngredient(ingredient: Ingredient, originalServings: number, desiredServings: number): Ingredient {
  return {
    ...ingredient,
    quantity: scaleQuantity(ingredient.quantity, originalServings, desiredServings),
  };
}

export function roundToNice(value: number): number {
  if (value < 0.125) return Math.round(value * 100) / 100;
  if (value < 1) {
    const fractions = [0.25, 0.33, 0.5, 0.67, 0.75, 1];
    return fractions.reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev));
  }
  if (value < 10) return Math.round(value * 4) / 4;
  if (value < 100) return Math.round(value * 2) / 2;
  return Math.round(value);
}

export function formatQuantity(quantity: number): string {
  const fractionMap: Record<number, string> = {
    0.25: "¼",
    0.33: "⅓",
    0.5: "½",
    0.67: "⅔",
    0.75: "¾",
  };

  const whole = Math.floor(quantity);
  const decimal = quantity - whole;

  const fraction = Object.entries(fractionMap).find(([num]) => Math.abs(parseFloat(num) - decimal) < 0.05);

  if (fraction && whole === 0) {
    return fraction[1];
  }
  if (fraction && whole > 0) {
    return `${whole}${fraction[1]}`;
  }
  if (whole === quantity) {
    return whole.toString();
  }

  return quantity.toFixed(quantity < 1 ? 2 : 1).replace(/\.?0+$/, "");
}

export function formatMeasurement(
  quantity: number,
  unit: string,
  unitSystem: UnitSystem,
  originalUnit?: string,
): string {
  const sourceUnit = originalUnit || unit;
  const isOriginalImperial = !!CONVERSION_FACTORS[sourceUnit.toLowerCase()];
  const isOriginalMetric = !!REVERSE_CONVERSION[sourceUnit.toLowerCase()];

  let finalQuantity = quantity;
  let finalUnit = unit;

  if (unitSystem === "metric" && isOriginalImperial) {
    const converted = convertUnit(quantity, sourceUnit, "metric");
    finalQuantity = converted.quantity;
    finalUnit = converted.unit;
  } else if (unitSystem === "imperial" && isOriginalMetric) {
    const converted = convertUnit(quantity, sourceUnit, "imperial");
    finalQuantity = converted.quantity;
    finalUnit = converted.unit;
  }

  const formattedQty = formatQuantity(finalQuantity);

  if (!finalUnit || finalUnit === "unit" || finalUnit === "piece") {
    return formattedQty;
  }

  return `${formattedQty} ${finalUnit}`;
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function formatTimeRange(prepMinutes: number, cookMinutes: number): string {
  const total = prepMinutes + cookMinutes;
  return formatTime(total);
}
