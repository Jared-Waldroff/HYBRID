import { Component } from 'react'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })
        console.error('Error caught by boundary:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    margin: '20px',
                    background: '#1a1a2e',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    maxHeight: '80vh',
                    overflow: 'auto'
                }}>
                    <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>
                        ⚠️ Something went wrong
                    </h2>
                    <p style={{ marginBottom: '15px', color: '#ccc' }}>
                        Error details (for debugging):
                    </p>
                    <pre style={{
                        background: '#0a0a14',
                        padding: '15px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {this.state.error?.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '15px',
                            padding: '10px 20px',
                            background: '#1e3a5f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload App
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
