import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

const style: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: '#000', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif", color: '#fff', padding: 32, textAlign: 'center',
  },
  logo: { marginBottom: 32 },
  icon: { fontSize: 48, marginBottom: 16, opacity: 0.4 },
  heading: {
    fontFamily: "'Recoleta', Georgia, serif", fontSize: 28, fontWeight: 600,
    marginBottom: 12, letterSpacing: '-0.02em',
  },
  sub: { fontSize: 15, color: '#9A9A9A', maxWidth: 380, lineHeight: 1.6, marginBottom: 32 },
  badge: {
    display: 'inline-block', background: 'rgba(255,255,0,0.08)',
    border: '1px solid rgba(255,255,0,0.15)', borderRadius: 8,
    padding: '4px 12px', fontSize: 11, color: '#FFFF00',
    letterSpacing: '0.1em', fontWeight: 700, marginBottom: 24,
  },
  btn: {
    background: '#FFFF00', color: '#000', border: 0, borderRadius: 10,
    padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
  detail: {
    marginTop: 24, fontSize: 11, color: '#444', maxWidth: 480,
    fontFamily: 'monospace', wordBreak: 'break-all',
  },
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || 'Unknown error' };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', err, info);
    // Report to server so it appears in deployment logs
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: err?.message,
        stack: err?.stack + '\n\nComponent stack:' + info?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={style.root}>
        <img src="/thndr-logo-full.png" height={24} alt="Thndr" style={style.logo} />
        <div style={style.badge}>EGX · CORPORATE ACTIONS</div>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
        <div style={style.heading}>Something went wrong</div>
        <div style={style.sub}>
          We hit an unexpected error. Our team has been notified — please try refreshing the page.
        </div>
        <button style={style.btn} onClick={() => window.location.reload()}>
          Refresh page
        </button>
        {this.state.message && (
          <div style={style.detail}>{this.state.message}</div>
        )}
      </div>
    );
  }
}
