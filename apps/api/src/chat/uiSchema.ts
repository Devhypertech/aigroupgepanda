/**
 * UI Schema Definitions
 * Zod schemas for validating AI-generated UI responses
 */

import { z } from 'zod';

// Widget schemas
export const TripPlanWidgetSchema = z.object({
  type: z.literal('trip_plan'),
  widgets: z.array(z.object({
    id: z.string(),
    kind: z.enum(['input', 'datepicker', 'slider', 'dropdown', 'toggle', 'button']),
    label: z.string(),
    value: z.any().optional(),
    placeholder: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    options: z.array(z.string()).optional(),
    checked: z.boolean().optional(),
  })),
  cards: z.array(z.any()).optional(),
});

export const FlightSearchWidgetSchema = z.object({
  type: z.literal('flight_search'),
  widgets: z.array(z.object({
    id: z.string(),
    kind: z.enum(['input', 'datepicker', 'number', 'button']),
    label: z.string(),
    value: z.any().optional(),
    placeholder: z.string().optional(),
  })),
  cards: z.array(z.any()).optional(),
});

export const ProductListWidgetSchema = z.object({
  type: z.literal('product_list'),
  widgets: z.array(z.any()).optional(),
  cards: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    image: z.string().optional(),
    price: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    items: z.array(z.string()).optional(),
    actions: z.array(z.object({
      label: z.string(),
      url: z.string().optional(),
      action: z.string().optional(),
      payload: z.any().optional(),
    })).optional(),
  })),
});

// Cards UI schema (for product recommendations, etc.)
export const CardsWidgetSchema = z.object({
  type: z.literal('cards'),
  title: z.string().optional(),
  cards: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    image: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    items: z.array(z.string()).optional(),
    actions: z.array(z.object({
      label: z.string(),
      url: z.string().optional(),
      action: z.string().optional(),
      payload: z.any().optional(),
    })),
  })),
  actions: z.array(z.object({
    label: z.string(),
    url: z.string().optional(),
    action: z.string().optional(),
    payload: z.any().optional(),
  })).optional(),
});

// Panel UI schema (simpler cards format)
export const PanelWidgetSchema = z.object({
  type: z.literal('panel'),
  title: z.string().optional(),
  bullets: z.array(z.string()).optional(), // Top-level bullets
  actions: z.array(z.object({
    label: z.string(),
    url: z.string().optional(),
    action: z.string().optional(),
    payload: z.any().optional(),
  })).optional(), // Top-level actions
  cards: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    image: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    items: z.array(z.string()).optional(),
    actions: z.array(z.object({
      label: z.string(),
      url: z.string().optional(),
      action: z.string().optional(),
      payload: z.any().optional(),
    })),
  })).optional(),
});

export const WeatherWidgetSchema = z.object({
  type: z.literal('weather'),
  widgets: z.array(z.any()).optional(),
  cards: z.array(z.any()).optional(),
});

export const SummaryWidgetSchema = z.object({
  type: z.literal('summary'),
  widgets: z.array(z.object({
    id: z.string(),
    kind: z.literal('button'),
    label: z.string(),
    action: z.object({
      type: z.string(),
      name: z.string(),
    }),
  })),
  cards: z.array(z.any()).optional(),
});

// Union of all UI types
export const UIResponseSchema = z.discriminatedUnion('type', [
  TripPlanWidgetSchema,
  FlightSearchWidgetSchema,
  ProductListWidgetSchema,
  WeatherWidgetSchema,
  SummaryWidgetSchema,
  CardsWidgetSchema,
  PanelWidgetSchema,
]);

// Main chat response schema
export const ChatResponseSchema = z.object({
  text: z.string(),
  ui: UIResponseSchema.nullable().optional(), // Allow null for fallback cases
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type UIResponse = z.infer<typeof UIResponseSchema>;
export type TripPlanWidget = z.infer<typeof TripPlanWidgetSchema>;
export type FlightSearchWidget = z.infer<typeof FlightSearchWidgetSchema>;
export type ProductListWidget = z.infer<typeof ProductListWidgetSchema>;
export type WeatherWidget = z.infer<typeof WeatherWidgetSchema>;
export type SummaryWidget = z.infer<typeof SummaryWidgetSchema>;

