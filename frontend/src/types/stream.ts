export interface MissionPlan {
  title: string;
  steps: string[];
}

export interface NavigationRoute {
  origin: string;
  destination_a: string;
  destination_b?: string;
  mode?: "driving" | "walking" | "transit" | "bicycling";
}

export interface ActionCardData {
  type:
    | "imessage"
    | "nessie"
    | "transit_alert"
    | "mission_plan"
    | "clear_plan"
    | "navigation"
    | "hide_plan"
    | "show_plan"
    | "destroy_plan"
    | "close_map"
    | "hide_map"
    | "weather"
    | "clock";
  title: string;
  details: string;
  status: "success" | "pending" | "warning";
  timestamp?: number;
  id?: string;
  expiresAt?: number;
  plan?: MissionPlan;
  navigation?: NavigationRoute;
}

export interface CopilotResponseEvent {
  type: "copilot_response";
  text: string;
  language: string;
  spatial_state?: string;
  action_cards: ActionCardData[];
}

export interface AudioChunkEvent {
  type: "audio_chunk";
  audio: string; // base64 encoded audio chunk
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  audio?: string;
  spatialState?: string;
}

export type IncomingStreamEvent = CopilotResponseEvent | AudioChunkEvent;

