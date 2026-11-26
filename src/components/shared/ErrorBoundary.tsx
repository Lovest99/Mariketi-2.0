import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, MariketiLogo } from '../ui/DesignSystem';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuotaError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'An unexpected error occurred.';
    const isQuotaError = raw.toLowerCase().includes('quota exceeded');
    let friendly = 'Something went wrong while syncing your MARIKETI session. Please reload to continue.';
    if (isQuotaError) {
      friendly = 'Daily service usage quota has been reached. Please try again tomorrow or review plan limits.';
    } else if (raw.includes('Missing or insufficient permissions')) {
      friendly = 'You do not have permission to perform that action with the current account role.';
    }
    return {
      hasError: true,
      message: friendly,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error) {
    console.error('MARIKETI ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', isQuotaError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F3F6F9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#DFE6EE] rounded-xl shadow-[0_8px_28px_rgba(16,36,58,0.08)] p-6 space-y-5">
          <div className="pb-4 border-b border-[#DFE6EE]">
            <MariketiLogo />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#FEF2F2] text-[#C53939] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#10243A]">
                {this.state.isQuotaError ? 'Service Limit Reached' : 'Workspace Recovery Needed'}
              </h1>
              <p className="text-xs text-[#526071] mt-1 leading-relaxed">
                {this.state.message}
              </p>
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={this.handleReset}>
            <RotateCcw className="w-4 h-4" />
            Reload MARIKETI
          </Button>
        </div>
      </div>
    );
  }
}
