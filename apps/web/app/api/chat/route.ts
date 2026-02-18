import { NextResponse } from "next/server";

type UIEventBody = {
  name?: string;
  payload?: any;
  tripState?: any;
  messages?: any[];
};

function buildItinerary(payload: any) {
  const destination = payload?.destination ?? "your destination";
  const startDate = payload?.startDate ?? "";
  const endDate = payload?.endDate ?? "";
  const travelStyle = Array.isArray(payload?.travelStyle) ? payload.travelStyle : [];

  // Mock itinerary (stable for now). Replace later with real generator/LLM.
  const days = 5;
  const itinerary = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1} in ${destination}`,
    summary:
      travelStyle.length
        ? `Plan focused on ${travelStyle.join(", ")}.`
        : `A balanced day of sights, food, and local culture.`,
    blocks: [
      { time: "Morning", text: "Breakfast + a must-see landmark." },
      { time: "Afternoon", text: "Neighborhood exploration + local lunch." },
      { time: "Evening", text: "Dinner + a scenic night activity." },
    ],
  }));

  return {
    reply: `Here’s a starter itinerary for ${destination}${startDate && endDate ? ` (${startDate} → ${endDate})` : ""}. Want it faster-paced or more relaxed?`,
    panel: "itinerary",
    data: { itinerary },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UIEventBody;

    const name = body?.name;
    const payload = body?.payload ?? {};

    if (!name) {
      return NextResponse.json(
        { error: "Missing event name" },
        { status: 400 }
      );
    }

    // ✅ Handle events
    if (name === "generate_itinerary") {
      const result = buildItinerary(payload);
      return NextResponse.json(result);
    }

    // You can add more events here:
    // if (name === "search_flights") ...
    // if (name === "search_hotels") ...
    // if (name === "book_hotel") ... (HITL later)

    return NextResponse.json(
      { reply: `Event "${name}" received, but no handler is implemented yet.`, panel: "none" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/chat/ui/event] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
