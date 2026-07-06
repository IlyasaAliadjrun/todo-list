import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Error boundary global: cegah layar putih saat komponen error. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error:", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
          <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Maaf, ada yang tidak beres di aplikasi. Coba muat ulang halaman.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            Muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
