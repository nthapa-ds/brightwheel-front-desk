import { orchestrator } from '../../../lib/orchestrator';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    logs: orchestrator.getLogs(),
    knowledgeBase: orchestrator.getKnowledgeBase()
  });
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();

    // Pass the full updates object to the orchestrator
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