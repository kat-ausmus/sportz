import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ componentStack: errorInfo?.componentStack ?? '' });
    console.error('Client app crashed during render.', error, errorInfo);
  }

  render() {
    const { error, componentStack } = this.state;

    if (error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
          <section className="w-full max-w-xl rounded-lg border border-rose-500/30 bg-zinc-900 p-6 shadow-soft">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">
              Sportz
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white">Client error</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              The app failed while rendering. Check the browser console for the underlying error.
            </p>
            <pre className="mt-4 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-rose-200">
              {error instanceof Error ? error.stack || error.message : String(error)}
              {componentStack ? `\n\n${componentStack}` : ''}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
