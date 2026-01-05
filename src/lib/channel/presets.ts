/**
 * Channel Presets Configuration
 *
 * Defines default values for each location channel type.
 * These are applied during onboarding and can be customized later.
 */

import type { Channel } from "@prisma/client";

export interface ChannelPreset {
  label: string;
  description: string;
  targetFoodCostPct: number;
  popularityThresholdPct: number;
  marginThresholdPct: number;
  confidenceQtyHigh: number;
  confidenceQtyMedium: number;
  priceIncreaseMaxPct: number;
  priceIncreaseMaxAbs: number;
  allowPremiumCross85th: boolean;
  focusLineTemplate: string;
}

export const CHANNEL_PRESETS: Record<Channel, ChannelPreset> = {
  BAR_KITCHEN: {
    label: "Bar & Kitchen",
    description: "Bar with food menu, gastropub",
    targetFoodCostPct: 30,
    popularityThresholdPct: 60,
    marginThresholdPct: 60,
    confidenceQtyHigh: 20,
    confidenceQtyMedium: 10,
    priceIncreaseMaxPct: 0.08,
    priceIncreaseMaxAbs: 2.0,
    allowPremiumCross85th: false,
    focusLineTemplate: "This week's focus: {action} to boost bar food margins.",
  },
  FULL_SERVICE: {
    label: "Full Service Restaurant",
    description: "Sit-down dining with table service",
    targetFoodCostPct: 32,
    popularityThresholdPct: 60,
    marginThresholdPct: 60,
    confidenceQtyHigh: 20,
    confidenceQtyMedium: 10,
    priceIncreaseMaxPct: 0.1,
    priceIncreaseMaxAbs: 3.0,
    allowPremiumCross85th: false,
    focusLineTemplate: "This week's focus: {action} to optimize your dining menu.",
  },
  FAST_CASUAL: {
    label: "Fast Casual",
    description: "Counter service, quick turns",
    targetFoodCostPct: 28,
    popularityThresholdPct: 60,
    marginThresholdPct: 60,
    confidenceQtyHigh: 30,
    confidenceQtyMedium: 10,
    priceIncreaseMaxPct: 0.06,
    priceIncreaseMaxAbs: 1.5,
    allowPremiumCross85th: false,
    focusLineTemplate: "This week's focus: {action} to drive fast-casual efficiency.",
  },
  CAFE: {
    label: "Cafe / Coffee Shop",
    description: "Coffee, pastries, light fare",
    targetFoodCostPct: 25,
    popularityThresholdPct: 60,
    marginThresholdPct: 60,
    confidenceQtyHigh: 20,
    confidenceQtyMedium: 10,
    priceIncreaseMaxPct: 0.06,
    priceIncreaseMaxAbs: 1.0,
    allowPremiumCross85th: false,
    focusLineTemplate: "This week's focus: {action} to maximize cafe margins.",
  },
  BREWERY: {
    label: "Brewery / Taproom",
    description: "Craft beer focus with food",
    targetFoodCostPct: 28,
    popularityThresholdPct: 60,
    marginThresholdPct: 60,
    confidenceQtyHigh: 20,
    confidenceQtyMedium: 10,
    priceIncreaseMaxPct: 0.08,
    priceIncreaseMaxAbs: 2.0,
    allowPremiumCross85th: false,
    focusLineTemplate: "This week's focus: {action} to complement your brews.",
  },
  OTHER: {
    label: "Other",
    description: "Custom configuration",
    targetFoodCostPct: 30,
    popularityThresholdPct: 60,
    marginThresholdPct: 60,
    confidenceQtyHigh: 20,
    confidenceQtyMedium: 10,
    priceIncreaseMaxPct: 0.08,
    priceIncreaseMaxAbs: 2.0,
    allowPremiumCross85th: false,
    focusLineTemplate: "This week's focus: {action} to improve menu performance.",
  },
};

/**
 * Get preset values for a channel
 */
export function getChannelPreset(channel: Channel): ChannelPreset {
  return CHANNEL_PRESETS[channel] || CHANNEL_PRESETS.BAR_KITCHEN;
}

/**
 * Get location settings from channel preset
 */
export function getLocationSettingsFromChannel(channel: Channel): Omit<ChannelPreset, "label" | "description" | "focusLineTemplate"> {
  const preset = getChannelPreset(channel);
  return {
    targetFoodCostPct: preset.targetFoodCostPct,
    popularityThresholdPct: preset.popularityThresholdPct,
    marginThresholdPct: preset.marginThresholdPct,
    confidenceQtyHigh: preset.confidenceQtyHigh,
    confidenceQtyMedium: preset.confidenceQtyMedium,
    priceIncreaseMaxPct: preset.priceIncreaseMaxPct,
    priceIncreaseMaxAbs: preset.priceIncreaseMaxAbs,
    allowPremiumCross85th: preset.allowPremiumCross85th,
  };
}

/**
 * Channel options for UI display
 */
export const CHANNEL_OPTIONS: Array<{ value: Channel; label: string; description: string }> = [
  { value: "BAR_KITCHEN", label: "Bar & Kitchen", description: "Bar with food menu, gastropub" },
  { value: "FULL_SERVICE", label: "Full Service Restaurant", description: "Sit-down dining with table service" },
  { value: "FAST_CASUAL", label: "Fast Casual", description: "Counter service, quick turns" },
  { value: "CAFE", label: "Cafe / Coffee Shop", description: "Coffee, pastries, light fare" },
  { value: "BREWERY", label: "Brewery / Taproom", description: "Craft beer focus with food" },
  { value: "OTHER", label: "Other", description: "Custom configuration" },
];
