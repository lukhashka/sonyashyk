/** Tiny typed event bus for cross-module communication (modules never import each other). */
export interface AppEvents {
  'task.completed': { taskId: string; moduleId: string; xp: number };
  'day.completed': { studyDay: string };
  'xp.awarded': { amount: number };
  'words.learned': { count: number };
}

type Handler<K extends keyof AppEvents> = (payload: AppEvents[K]) => void;

const handlers = new Map<keyof AppEvents, Set<Handler<never>>>();

export function on<K extends keyof AppEvents>(event: K, handler: Handler<K>): () => void {
  const set = handlers.get(event) ?? new Set();
  set.add(handler as Handler<never>);
  handlers.set(event, set);
  return () => set.delete(handler as Handler<never>);
}

export function emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
  handlers.get(event)?.forEach((h) => {
    try {
      (h as Handler<K>)(payload);
    } catch (err) {
      if (import.meta.env.DEV) console.error(`Handler for ${event} failed`, err);
    }
  });
}
