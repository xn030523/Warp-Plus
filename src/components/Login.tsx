import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
  session: UserSession | null;
  onLogout: () => void;
}

interface UserSession {
  token: string;
  role: string;
  balance: number;
  logged_in_at: string;
}

interface MyTokenRecord {
  id: number;
  user_id: number;
  account_id: number;
  email: string;
  refresh_token: string;
  ai_limit: number;
  created_at: string;
}

function Login({ onLoginSuccess, session }: LoginProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [tokens, setTokens] = useState<MyTokenRecord[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await invoke<{
        success: boolean;
        message: string;
        token?: string;
        role?: string;
        balance?: number;
      }>('login', { password });

      if (response.success && response.token && response.role !== undefined) {
        // 获取会话信息
        const session = await invoke<UserSession>('get_session');
        onLoginSuccess(session);
        showToast('登录成功', 'success');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err) {
      setError(`登录失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 兼容复制：优先使用 Clipboard API，失败则使用隐藏文本域回退
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error('Clipboard API 不可用');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const refreshBalance = async () => {
    try {
      const userSession = await invoke<UserSession>('refresh_session');
      onLoginSuccess(userSession);
      showToast('余额已刷新', 'success');
    } catch (error) {
      console.error('刷新余额失败:', error);
      showToast(`刷新失败: ${error}`, 'error');
    }
  };

  const fetchMyTokens = async () => {
    if (!session) return;
    setTokensLoading(true);
    try {
      const resp = await invoke<{ success: boolean; data?: MyTokenRecord[]; total?: number }>('get_my_tokens');
      if (resp && resp.success && resp.data) {
        setTokens(resp.data);
      } else {
        showToast('获取 Token 记录失败', 'error');
      }
    } catch (e) {
      showToast(`获取失败: ${e}`, 'error');
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchMyTokens();
  }, [session]);

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      showToast('请输入有效的充值金额', 'error');
      return;
    }

    setRechargeLoading(true);
    try {
      const result = await invoke<{
        out_trade_no: string;
        payment_url: string;
        amount: number;
      }>('create_recharge_order', { 
        amount, 
        paymentType: 'alipay'
      });

      // 显示支付页面
      setPaymentUrl(result.payment_url);
      
      // 关闭充值对话框
      setShowRechargeModal(false);
      setRechargeAmount('');
      showToast(`订单创建成功，金额: ¥${result.amount}`, 'success');
    } catch (err) {
      showToast(`充值失败: ${err}`, 'error');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleClosePayment = () => {
    setPaymentUrl(null);
    // 关闭支付页面时自动刷新余额
    refreshBalance();
  };

  // 已登录状态：显示账户信息
  if (session) {
    return (
      <div className="page-content">
        <h2>账户中心</h2>
        <div className="account-info-card">
          <div className="account-header">
            <div className="account-avatar">
              {session.role === 'admin' ? 'A' : 'U'}
            </div>
            <div className="account-role-badge">
              {session.role === 'admin' ? '管理员' : '普通用户'}
            </div>
          </div>
          
          <div className="account-details">
            <div className="detail-item balance-row">
              <div>
                <span className="detail-label">账户余额</span>
                <span className="detail-value balance">¥{session.balance.toFixed(2)}</span>
              </div>
              <button className="refresh-balance-btn" onClick={refreshBalance}>
                刷新余额
              </button>
            </div>
            <div className="detail-item">
              <span className="detail-label">Warp 价格</span>
              <span className="detail-value">4元/个</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">登录时间</span>
              <span className="detail-value">{new Date(session.logged_in_at).toLocaleString('zh-CN')}</span>
            </div>
          </div>

          <div className="account-actions">
            <button className="action-btn primary" onClick={() => setShowRechargeModal(true)}>
              充值
            </button>
          </div>
        </div>

        {/* 我的 Token 记录 */}
        <div className="token-list-card">
          <div className="token-list-header">
            <h3>我的 Token 记录</h3>
            <button className="refresh-balance-btn" onClick={fetchMyTokens} disabled={tokensLoading}>
              {tokensLoading ? '加载中...' : '刷新记录'}
            </button>
          </div>
          {tokens.length === 0 && !tokensLoading ? (
            <div className="empty-state">暂无记录</div>
          ) : (
            <div className="token-table-wrap">
              <table className="token-table">
                <thead>
                  <tr>
                    <th>邮箱</th>
                    <th>额度</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.id}>
                      <td className="email">{t.email}</td>
                      <td>{t.ai_limit}</td>
                      <td>{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                      <td>
                        <button
                          className="btn-link"
                          onClick={async () => {
                            const ok = await copyToClipboard(t.refresh_token);
                            showToast(ok ? '已复制 Token' : '复制失败', ok ? 'success' : 'error');
                          }}
                          title="复制完整 Refresh Token"
                        >
                          📋 复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 充值对话框 */}
        {showRechargeModal && (
          <div className="modal-overlay" onClick={() => setShowRechargeModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>充值</h3>
              <div className="form-group">
                <label>充值金额（元）</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="请输入充值金额"
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowRechargeModal(false)}>
                  取消
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleRecharge}
                  disabled={rechargeLoading}
                >
                  {rechargeLoading ? '创建中...' : '确认充值'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 支付页面 */}
        {paymentUrl && (
          <div className="payment-overlay" onClick={handleClosePayment}>
            <div className="payment-container" onClick={(e) => e.stopPropagation()}>
              <div className="payment-header">
                <h3>支付宝支付</h3>
                <button className="payment-close" onClick={handleClosePayment}>×</button>
              </div>
              <div className="payment-tips">
                支付完成后请关闭此窗口，系统将自动刷新您的余额
              </div>
              <iframe
                src={paymentUrl}
                className="payment-iframe"
                title="支付页面"
              />
            </div>
          </div>
        )}

        <div className="ad-banner">
          <span className="ad-icon">💬</span>
          <span className="ad-text">交流群</span>
          <span className="ad-group">
            QQ群:
            <a 
              href="https://qm.qq.com/q/vi1EFO0mxG" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ad-group-link"
            >
              1014952167
            </a>
          </span>
        </div>

        {/* Toast 通知 */}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  // 未登录状态：显示登录表单
  return (
    <div className="page-content">
      <h2>账户中心</h2>
      
      {/* Toast 通知 */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
      <div className="login-card">
        <div className="login-info">
          <h3>账户说明</h3>
          <div className="info-item">
            <strong>管理员</strong>：输入管理员密码登录，拥有完整权限
          </div>
          <div className="info-item">
            <strong>普通用户</strong>：输入任意密码即可登录，首次输入会自动创建账户
          </div>
          <div className="info-item">
            每个账户都有独立的余额，用于购买 Warp Token
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="password">账户密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
