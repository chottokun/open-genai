// 非セキュアコンテキスト(http://*.local 等)における crypto.randomUUID のポリフィル
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  // @ts-ignore
  window.crypto.randomUUID = function () {
    const r = (c: any) => {
      const cryptoObj = window.crypto || (window as any).msCrypto;
      if (cryptoObj && cryptoObj.getRandomValues) {
        const arr = new Uint8Array(1);
        cryptoObj.getRandomValues(arr);
        return (c ^ (arr[0] & (15 >> (c / 4)))).toString(16);
      }
      return (c ^ ((Math.random() * 16) & (15 >> (c / 4)))).toString(16);
    };
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, r);
  };
}

import { App } from './App.tsx';
import './index.css';
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router';
import { OnlineStatusProvider } from '@/components/OnlineStatusProvider';
import { GlobalErrorFallback } from '@/components/ui/GlobalErrorFallback';
import { captureTokenFromUrl, isAuthenticated, login } from '@/local/localAuth';

// ACS からのリダイレクトで付与された #token= を取り込む（描画前に実行）
captureTokenFromUrl();

// Open GENAI: ローカル SAML 認証のログインゲート。
// 未認証なら backend の SAML ログインへリダイレクトする。
// サインアウト後・認証エラーページは認証不要で表示する。
const AuthGate = ({ children }: { children: ReactNode }) => {
  const path = window.location.pathname;
  if (path === '/signed-out' || path === '/auth-error') {
    return <>{children}</>;
  }
  if (!isAuthenticated()) {
    login();
    return null;
  }
  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OnlineStatusProvider>
      <AuthGate>
        <BrowserRouter>
          <ErrorBoundary
            fallbackRender={GlobalErrorFallback}
            onReset={() => window.location.reload()}
          >
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthGate>
    </OnlineStatusProvider>
  </React.StrictMode>,
);
