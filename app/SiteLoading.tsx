"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppLoading from "./app/AppLoading";

const LoadingContext = createContext<{
  setWorkspace: (loading: boolean, error: string) => void;
  setRoutePending: (pending: boolean) => void;
}>({ setWorkspace: () => {}, setRoutePending: () => {} });

export function useWorkspaceLoading(loading: boolean, error: string) {
  const { setWorkspace } = useContext(LoadingContext);
  useEffect(() => { setWorkspace(loading, error); }, [loading, error, setWorkspace]);
}

export function RoutePending() {
  const { setRoutePending } = useContext(LoadingContext);
  useEffect(() => {
    setRoutePending(true);
    return () => setRoutePending(false);
  }, [setRoutePending]);
  return null;
}

function PageLoading({ children, pathname }: { children: ReactNode; pathname: string }) {
  const [visible, setVisible] = useState(true);
  const [documentReady, setDocumentReady] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(pathname === "/app");
  const [error, setError] = useState("");
  const [routePending, setRoutePending] = useState(false);
  const setWorkspace = useCallback((loading: boolean, message: string) => {
    setWorkspaceLoading(loading);
    setError(message);
  }, []);
  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const ready = () => setDocumentReady(true);
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
    return () => window.removeEventListener("load", ready);
  }, []);

  return <LoadingContext.Provider value={{ setWorkspace, setRoutePending }}>
    {visible && <AppLoading complete={documentReady && !workspaceLoading && !routePending && !error} error={error || undefined} onExited={dismiss} />}
    <div inert={visible} style={{ display: "contents" }}>{children}</div>
  </LoadingContext.Provider>;
}

export default function SiteLoading({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  return <PageLoading key={pathname} pathname={pathname}>{children}</PageLoading>;
}
