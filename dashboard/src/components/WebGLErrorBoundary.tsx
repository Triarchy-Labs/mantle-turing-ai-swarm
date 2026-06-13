import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: string; }

export class WebGLErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error: error.message };
	}

	componentDidCatch(error: Error) {
		console.warn('[WebGLErrorBoundary] 3D scene crashed:', error.message);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback ?? (
				<div style={{
					width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
					background: 'rgba(5,5,12,0.6)', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.1)',
				}}>
					<div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', opacity: 0.5, textAlign: 'center' }}>
						<div style={{ marginBottom: '8px', fontSize: '1.9rem' }}>⬡</div>
						3D CORE: CONTEXT LOST
						<div style={{ fontSize: '1.0rem', opacity: 0.4, marginTop: '4px' }}>{this.state.error}</div>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}
