/**
 * UI Spec Types and Zod Schemas
 * Shared types for chat UI messages
 */

import { z } from 'zod';

// Action Types
export const EventActionSchema = z.object({
  type: z.literal('event'),
  name: z.string(),
  payload: z.any().optional(),
});

export type EventAction = z.infer<typeof EventActionSchema>;

export const ActionSchema = EventActionSchema; // For now, only event actions

export type Action = z.infer<typeof ActionSchema>;

// Widget Types
export const ButtonWidgetSchema = z.object({
  kind: z.literal('button'),
  id: z.string(),
  label: z.string(),
  action: EventActionSchema,
});

export const ChipsWidgetSchema = z.object({
  kind: z.literal('chips'),
  id: z.string(),
  label: z.string(),
  options: z.array(z.string()),
  selected: z.array(z.string()).optional(),
});

export const SliderWidgetSchema = z.object({
  kind: z.literal('slider'),
  id: z.string(),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  value: z.number(),
});

export const InputWidgetSchema = z.object({
  kind: z.literal('input'),
  id: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  value: z.string().optional(),
});

export const CardWidgetSchema = z.object({
  kind: z.literal('card'),
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  actions: z.array(ActionSchema).optional(),
});

export const ChecklistWidgetSchema = z.object({
  kind: z.literal('checklist'),
  id: z.string(),
  label: z.string(),
  items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    checked: z.boolean().optional(),
  })),
});

export const DatePickerWidgetSchema = z.object({
  kind: z.literal('datepicker'),
  id: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  value: z.string().optional(), // ISO date string or date range string
  mode: z.enum(['single', 'range']).optional().default('single'),
});

export const NumberWidgetSchema = z.object({
  kind: z.literal('number'),
  id: z.string(),
  label: z.string(),
  min: z.number().optional().default(1),
  max: z.number().optional().default(20),
  value: z.number().optional(),
  placeholder: z.string().optional(),
});

export const SelectWidgetSchema = z.object({
  kind: z.literal('select'),
  id: z.string(),
  label: z.string(),
  options: z.array(z.string()),
  value: z.string().optional(),
});

// Layout widgets for dynamic UI generation
export const SectionWidgetSchema = z.object({
  kind: z.literal('section'),
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  children: z.array(z.lazy(() => WidgetSchema)), // Recursive for nested layouts
});

export const RowWidgetSchema = z.object({
  kind: z.literal('row'),
  id: z.string(),
  gap: z.number().optional().default(4),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional().default('start'),
  children: z.array(z.lazy(() => WidgetSchema)),
});

export const ColumnWidgetSchema = z.object({
  kind: z.literal('column'),
  id: z.string(),
  gap: z.number().optional().default(4),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional().default('start'),
  children: z.array(z.lazy(() => WidgetSchema)),
});

export const GridWidgetSchema = z.object({
  kind: z.literal('grid'),
  id: z.string(),
  columns: z.number().optional().default(2),
  gap: z.number().optional().default(4),
  children: z.array(z.lazy(() => WidgetSchema)),
});

// Form widget for auto-generated forms
export const FormWidgetSchema = z.object({
  kind: z.literal('form'),
  id: z.string(),
  title: z.string().optional(),
  fields: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'email', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio']),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional().default(false),
    options: z.array(z.string()).optional(), // For select/radio
    value: z.any().optional(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    }).optional(),
  })),
  submitAction: EventActionSchema,
});

// Checkout widget for shopping/payment UI
export const CheckoutWidgetSchema = z.object({
  kind: z.literal('checkout'),
  id: z.string(),
  title: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number(),
    quantity: z.number().optional().default(1),
    imageUrl: z.string().optional(),
    productId: z.string().optional(), // For checkout intent
  })),
  total: z.number(),
  currency: z.string().optional().default('USD'),
  paymentAction: EventActionSchema,
  productType: z.enum(['product', 'esim', 'flight', 'hotel', 'package']).optional().default('product'),
});

// Confirmation widget: show order summary + Confirm / Proceed (calls checkout intent)
export const ConfirmationWidgetSchema = z.object({
  kind: z.literal('confirmation'),
  id: z.string(),
  title: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    productId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number(),
    quantity: z.number().optional().default(1),
    imageUrl: z.string().optional(),
  })),
  total: z.number(),
  currency: z.string().optional().default('USD'),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    region: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  paymentPreference: z.enum(['card', 'paypal', 'crypto', 'wallet']).optional(),
  productType: z.enum(['product', 'esim', 'flight', 'hotel', 'package']).optional().default('product'),
  confirmAction: EventActionSchema.optional(),
  proceedAction: EventActionSchema.optional(),
});

// Planning widget for interactive trip planning
export const PlanningWidgetSchema = z.object({
  kind: z.literal('planning'),
  id: z.string(),
  title: z.string().optional(),
  timeline: z.array(z.object({
    id: z.string(),
    date: z.string(),
    title: z.string(),
    description: z.string().optional(),
    activities: z.array(z.string()).optional(),
    editable: z.boolean().optional().default(true),
  })),
  actions: z.array(ActionSchema).optional(),
});

export const WidgetSchema: z.ZodType<any> = z.discriminatedUnion('kind', [
  ButtonWidgetSchema,
  ChipsWidgetSchema,
  SliderWidgetSchema,
  InputWidgetSchema,
  NumberWidgetSchema,
  SelectWidgetSchema,
  CardWidgetSchema,
  ChecklistWidgetSchema,
  DatePickerWidgetSchema,
  SectionWidgetSchema,
  RowWidgetSchema,
  ColumnWidgetSchema,
  GridWidgetSchema,
  FormWidgetSchema,
  CheckoutWidgetSchema,
  ConfirmationWidgetSchema,
  PlanningWidgetSchema,
]);

export type ButtonWidget = z.infer<typeof ButtonWidgetSchema>;
export type ChipsWidget = z.infer<typeof ChipsWidgetSchema>;
export type SliderWidget = z.infer<typeof SliderWidgetSchema>;
export type InputWidget = z.infer<typeof InputWidgetSchema>;
export type NumberWidget = z.infer<typeof NumberWidgetSchema>;
export type SelectWidget = z.infer<typeof SelectWidgetSchema>;
export type CardWidget = z.infer<typeof CardWidgetSchema>;
export type ChecklistWidget = z.infer<typeof ChecklistWidgetSchema>;
export type DatePickerWidget = z.infer<typeof DatePickerWidgetSchema>;
export type SectionWidget = z.infer<typeof SectionWidgetSchema>;
export type RowWidget = z.infer<typeof RowWidgetSchema>;
export type ColumnWidget = z.infer<typeof ColumnWidgetSchema>;
export type GridWidget = z.infer<typeof GridWidgetSchema>;
export type FormWidget = z.infer<typeof FormWidgetSchema>;
export type CheckoutWidget = z.infer<typeof CheckoutWidgetSchema>;
export type ConfirmationWidget = z.infer<typeof ConfirmationWidgetSchema>;
export type PlanningWidget = z.infer<typeof PlanningWidgetSchema>;
export type Widget = z.infer<typeof WidgetSchema>;

// UiSpec - Enhanced with layout support
export const UiSpecSchema = z.object({
  id: z.string(),
  type: z.enum([
    'trip_planner',
    'trip_profile', // Trip profile form (peopleCount, audienceType, interests)
    'cards',
    'form',
    'slider',
    'checklist',
    'layout',
    'checkout',
    'confirmation',
    'planning',
  ]),
  title: z.string().optional(),
  state: z.record(z.string(), z.any()),
  widgets: z.array(WidgetSchema),
  // Layout structure (optional - for complex nested layouts)
  layout: z.object({
    type: z.enum(['column', 'row', 'grid', 'stack']),
    gap: z.number().optional().default(4),
    padding: z.number().optional().default(4),
    sections: z.array(z.object({
      id: z.string(),
      title: z.string().optional(),
      widgets: z.array(WidgetSchema),
    })).optional(),
  }).optional(),
});

export type UiSpec = z.infer<typeof UiSpecSchema>;

