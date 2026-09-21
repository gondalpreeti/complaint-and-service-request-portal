import { Component } from "react";

export default class ChartErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Chart failed to render:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">
          This chart couldn't be displayed.
        </div>
      );
    }
    return this.props.children;
  }
}
