import { createEventGate } from "@/realtime/events";

/** Filtro único de eventos da aplicação (duplicatas e versões antigas). */
export const eventGate = createEventGate();
