import { useContext } from "react";
import { PlatformContext } from "./platform-context";
import type { PlatformState } from "./platform-context";

export function usePlatformAdmin(): PlatformState {
  return useContext(PlatformContext);
}
