import { orchestrator } from '../../../lib/orchestrator';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Parse the incoming message body
    const { messages } = await req.json();
    
    // Get the user's latest question
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Measure Latency 
    const startTime = Date.now();

    // Call the Orchestrator
    const result = await orchestrator.generateResponse(userQuery);

    // Calculate Latency
    const latency = Date.now() - startTime;

    // Return the JSON response
    return NextResponse.json({
      role: 'assistant',
      content: result.text,
      data: {
        latency: `${latency}ms`,
        ...result.metadata
      }
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}