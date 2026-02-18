/**
 * Itinerary Generation API
 * POST /api/tools/itinerary/generate
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function pick<T>(arr: T[], dayIndex: number): T {
  return arr[dayIndex % arr.length];
}

function generateDummyItinerary(params: {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  travelStyle?: string[];
}) {
  const destination = params.destination || 'Your Destination';
  const { startDate, endDate, budget, travelStyle } = params;
  const style = travelStyle || ['cultural', 'foodie'];

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const days = Math.max(1, Math.min(7, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))));
  const d = destination;

  const WALKING_MORNING = [
    `Walking: Explore ${d} historic quarter and local markets`,
    `Walking: Stroll through ${d} neighborhoods, discover hidden gems`,
    `Walking: Visit ${d} city center, landmarks and viewpoints`,
    `Walking: Walk along ${d} waterfront or riverfront`,
    `Walking: Discover ${d} street art and local districts`,
    `Walking: Morning walk through ${d} parks and gardens`,
    `Walking: Explore ${d} old town and historic streets`,
  ];

  const WALKING_AFTERNOON = [
    `Walking: Visit nearby ${d} museums and galleries`,
    `Walking: Browse ${d} local shops and boutiques`,
    `Walking: Explore ${d} food markets and street vendors`,
    `Walking: Visit ${d} temples, churches, or historic sites`,
    `Walking: Stroll through ${d} botanical gardens`,
    `Walking: Discover ${d} local cafes and viewpoints`,
    `Walking: Explore ${d} cultural quarter`,
  ];

  const MID_RANGE = [
    `5-10 miles: Day trip to ${d} coastal area`,
    `5-10 miles: Excursion to ${d} mountains or hills`,
    `5-10 miles: Visit nearby ${d} villages or towns`,
    `5-10 miles: Day trip to ${d} nature reserve`,
    `5-10 miles: Explore ${d} wine region or countryside`,
    `5-10 miles: Visit ${d} scenic viewpoints`,
    `5-10 miles: Day trip to ${d} beaches or lakes`,
  ];

  const FAR = [
    `10+ miles: Excursion to ${d} region highlights`,
    `10+ miles: Full-day trip to ${d} national park`,
    `10+ miles: Visit ${d} UNESCO sites or major attractions`,
    `10+ miles: Scenic drive through ${d} countryside`,
    `10+ miles: Day trip to ${d} islands or coast`,
    `10+ miles: Explore ${d} mountain region`,
    `10+ miles: Visit ${d} historic towns in the region`,
  ];

  const DINNERS = [
    `Dinner: Local restaurant in ${d} (traditional cuisine)`,
    `Dinner: Rooftop restaurant with ${d} views`,
    `Dinner: Food market or street food tour in ${d}`,
    `Dinner: Fine dining in ${d} historic district`,
    `Dinner: Seafood restaurant in ${d}`,
    `Dinner: Cooking class and dinner in ${d}`,
    `Dinner: Family-friendly restaurant in ${d}`,
  ];

  const NIGHT = [
    `Night: Live music or jazz bar in ${d}`,
    `Night: Rooftop bar with ${d} skyline views`,
    `Night: Night market or evening stroll in ${d}`,
    `Night: Theater or cultural performance in ${d}`,
    `Night: Local pub crawl in ${d}`,
    `Night: Sunset viewpoint then drinks in ${d}`,
    `Night: Night tour or evening cruise in ${d}`,
  ];

  const getDayPlan = (dayIndex: number) => {
    if (dayIndex === 0) {
      return {
        walking: [`Walking: Arrive in ${d} and check into accommodation`, `Walking: Get oriented, explore nearby area`],
        '5-10 miles': [] as string[],
        '10+ miles': [] as string[],
        dinner: pick(DINNERS, 0),
        night: pick(NIGHT, 0),
      };
    }
    return {
      walking: [pick(WALKING_MORNING, dayIndex), pick(WALKING_AFTERNOON, dayIndex)],
      '5-10 miles': [pick(MID_RANGE, dayIndex)],
      '10+ miles': [pick(FAR, dayIndex)],
      dinner: pick(DINNERS, dayIndex),
      night: pick(NIGHT, dayIndex),
    };
  };

  const itinerary = {
    destination,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    budget: budget || undefined,
    travelStyle: style,
    days: Array.from({ length: days }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const plan = getDayPlan(i);
      const activities = [...plan.walking, ...plan['5-10 miles'], ...plan['10+ miles'], plan.dinner, plan.night].filter(Boolean);
      return {
        day: i + 1,
        date: date.toISOString().split('T')[0],
        activities,
        distanceBuckets: { walking: plan.walking, '5-10 miles': plan['5-10 miles'], '10+ miles': plan['10+ miles'] },
      };
    }),
  };

  return itinerary;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, startDate, endDate, budget, travelStyle, userId } = body;

    // Generate dummy itinerary (deterministic based on params)
    const itinerary = generateDummyItinerary({
      destination,
      startDate,
      endDate,
      budget,
      travelStyle,
    });

    return NextResponse.json({
      success: true,
      itinerary,
    });
  } catch (error) {
    console.error('[Tools] Error generating itinerary:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate itinerary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

