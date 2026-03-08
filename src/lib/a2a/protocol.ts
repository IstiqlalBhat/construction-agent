import { A2AMessage, MessageType } from '../types';
import { store } from '../store';
import { v4 as uuidv4 } from 'uuid';

export async function createA2AMessage(
  type: MessageType,
  fromAgentId: string,
  toAgentId: string,
  projectId: string,
  payload: Record<string, unknown>
): Promise<A2AMessage> {
  const msg: A2AMessage = {
    id: uuidv4(),
    type,
    fromAgentId,
    toAgentId,
    projectId,
    payload,
    timestamp: new Date().toISOString(),
  };
  await store.addMessage(msg);
  return msg;
}

export async function getMessageHistory(projectId: string): Promise<A2AMessage[]> {
  return store.getMessageLog(projectId);
}

export async function getMessagesByType(projectId: string, type: MessageType): Promise<A2AMessage[]> {
  const messages = await store.getMessageLog(projectId);
  return messages.filter(m => m.type === type);
}
