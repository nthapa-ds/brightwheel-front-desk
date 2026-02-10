import { orchestrator } from '../../../lib/orchestrator';
import { NextResponse } from 'next/server';

/**
 * GET: Pulls the logs and the full Knowledge Base for the dashboard
 */
export async function GET() {
  return NextResponse.json({ 
    logs: orchestrator.getLogs(),
    knowledgeBase: orchestrator.getKnowledgeBase()
  });
}

/**
 * PATCH: Updates an existing policy (clears cache automatically in orchestrator)
 */
export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    const success = orchestrator.updatePolicy(id, updates);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}

/**
 * POST: Creates a brand new policy
 */
export async function POST(req: Request) {
  try {
    const { type, data } = await req.json();
    
    // We use the same updatePolicy logic; if the ID is new, it adds it to the list
    const success = orchestrator.updatePolicy(data.id, data);

    return NextResponse.json({ success: true, message: "Policy created" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create policy" }, { status: 400 });
  }
}

/**
 * DELETE: Removes a policy and clears the cache
 */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const success = orchestrator.deletePolicy(id);

    if (success) {
      return NextResponse.json({ success: true, message: "Policy deleted" });
    } else {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 400 });
  }
}