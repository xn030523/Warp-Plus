import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Login from "./components/Login";
import WarpLogin from "./components/WarpLogin";
import TempMail from "./components/TempMail";
import WarpUUID from "./components/WarpUUID";
import MCPManager from "./components/MCPManager";
import Unlimited from "./components/Unlimited";
import "./App.css";

interface UserSession {
  token: string;
  role: string;
  balance: number;
  logged_in_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("warp");
  const [session, setSession] = useState<UserSession | null>(null);

  // 启动时检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedIn = await invoke<boolean>('check_auth');
        if (loggedIn) {
          const userSession = await invoke<UserSession>('get_session');
          setSession(userSession);
        }
      } catch (error) {
        console.log('未登录');
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
  };

  const handleLogout = async () => {
    try {
      await invoke('logout');
      setSession(null);
      // 如果在账户页面，切换到其他页面
      if (activeTab === 'account') {
        setActiveTab('warp');
      }
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Warp Plus</h1>
        </div>
        <nav className="nav">
          <button 
            className={`nav-item ${activeTab === "warp-uuid" ? "active" : ""}`}
            onClick={() => setActiveTab("warp-uuid")}
          >
            我的信息
          </button>
          <button 
            className={`nav-item ${activeTab === "warp" ? "active" : ""}`}
            onClick={() => setActiveTab("warp")}
          >
            Warp 上号
          </button>
          <button 
            className={`nav-item ${activeTab === "unlimited" ? "active" : ""}`}
            onClick={() => setActiveTab("unlimited")}
          >
            Warp 无限额度
          </button>
          <button 
            className={`nav-item ${activeTab === "mcp" ? "active" : ""}`}
            onClick={() => setActiveTab("mcp")}
          >
            MCP 管理
          </button>
          <button 
            className={`nav-item ${activeTab === "temp-mail" ? "active" : ""}`}
            onClick={() => setActiveTab("temp-mail")}
          >
            临时邮箱
          </button>
        </nav>
        <div className="sidebar-footer">
          <button 
            className={`account-btn ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            {session ? (
              <>
                <span className="account-label">余额</span>
                <span className="account-balance">¥{session.balance.toFixed(2)}</span>
              </>
            ) : (
              <span className="account-label">登录</span>
            )}
          </button>
          {session && (
            <button className="logout-btn" onClick={handleLogout}>
              登出
            </button>
          )}
        </div>
      </div>

      <div className="content">
        {activeTab === "warp" && (
          <WarpLogin 
            session={session}
            onBalanceUpdate={(newBalance: number) => {
              setSession((prev) => prev ? { ...prev, balance: newBalance } : prev);
            }}
          />
        )}
        {activeTab === "unlimited" && <Unlimited />}
        {activeTab === "temp-mail" && <TempMail />}
        {activeTab === "warp-uuid" && <WarpUUID />}
        {activeTab === "mcp" && <MCPManager />}
        {activeTab === "account" && (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            session={session}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;
