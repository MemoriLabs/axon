import { registerClient } from "../../registry.js";
import { isOpenAIClient } from "./detect.js";
import { patchOpenAIClient } from "./proxy.js";

let registered = false;

export function register(): void {
  if (registered) return;
  registerClient(isOpenAIClient, patchOpenAIClient);
  registered = true;
}

register();
