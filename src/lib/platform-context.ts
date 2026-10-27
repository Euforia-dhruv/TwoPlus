import { createContext } from "react";

export type PlatformState = {
  /** Fail-closed: any error or missing session means NOT an admin. */
  isAdmin: boolean;
  role: string | null;
  loading: boolean;
  reload: () => void;
};

export const PlatformContext = createContext<PlatformState>({
  isAdmin: false,
  role: null,
  loading: true,
  reload: () => {},
});
