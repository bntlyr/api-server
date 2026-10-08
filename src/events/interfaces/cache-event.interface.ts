export interface DbCacheEvent {
  table: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  id: string;
  userId?: string | null;
  timestamp: string;
}

export interface ClientSubscribeDto {
  entities?: string[];
}
