import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET messages / A2A activity log
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const type = request.nextUrl.searchParams.get('type');

  let messages;
  if (projectId) {
    messages = await store.getMessageLog(projectId);
  } else {
    messages = await store.getAllMessages();
  }

  if (type) {
    messages = messages.filter(m => m.type === type);
  }

  // Return latest first
  return NextResponse.json([...messages].reverse().slice(0, 100));
}
