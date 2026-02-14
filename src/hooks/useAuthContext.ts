/**
 * Re-exports useAuth from the shared AuthContext provider.
 * Auth state is resolved once at the provider level and shared across all pages.
 */
export { useAuth as useAuthContext } from "@/contexts/AuthContext";
