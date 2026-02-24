// app/api/human/tasks/route.ts
//
// All three endpoints handled in one file:
//
//   POST /api/human/tasks            → search tasks
//   GET  /api/human/tasks?taskId=... → fetch task + form template
//   PUT  /api/human/tasks?taskId=... → submit / complete task

import { NextRequest } from "next/server";
import { orkesRequest } from "./orkes";

// POST — search
export async function POST(req: NextRequest) {
  const body = await req.json();
  return orkesRequest("/api/human/tasks/search", "POST", body);
}

// GET — fetch single task with form template
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Missing taskId query parameter" }, { status: 400 });
  }
  return orkesRequest(`/api/human/tasks/${taskId}?withTemplate=true`, "GET");
}

// PUT — submit / complete task
export async function PUT(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Missing taskId query parameter" }, { status: 400 });
  }
  const { output, complete } = await req.json();
  return orkesRequest(
    `/api/human/tasks/${taskId}/update?complete=${complete ?? true}`,
    "POST",
    output
  );
}
