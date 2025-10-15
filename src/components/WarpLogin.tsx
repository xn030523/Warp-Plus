import { useState, useMemo } from "react";

function WarpLogin() {
  const [refreshToken, setRefreshToken] = useState("");
  const [state, setState] = useState("");

  // 提取 state 参数
  const extractState = (input: string): string => {
    try {
      // 尝试从 URL 中提取 state 参数
      const url = new URL(input);
      const stateParam = url.searchParams.get("state");
      return stateParam || input;
    } catch {
      // 如果不是有效的 URL，直接返回原始输入
      return input;
    }
  };

  const handleStateChange = (value: string) => {
    const extractedState = extractState(value);
    setState(extractedState);
  };

  // 实时生成 URL
  const generatedUrl = useMemo(() => {
    if (!refreshToken || !state) return "";
    return `warp://auth/desktop_redirect?refresh_token=${encodeURIComponent(refreshToken)}&state=${encodeURIComponent(state)}`;
  }, [refreshToken, state]);

  const handleLogin = () => {
    if (!generatedUrl) return;
    
    const link = document.createElement('a');
    link.href = generatedUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="warp-login page-content">
      <h2>Warp 上号器</h2>
      
      <div className="form">
        <div className="input-group">
          <label>Refresh Token</label>
          <input
            type="text"
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            placeholder="输入 refresh_token"
          />
        </div>

        <div className="input-group">
          <label>State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            placeholder="输入 state 或完整 URL"
          />
          <small className="hint">支持直接粘贴完整 URL，自动提取 state 参数</small>
        </div>

        <button onClick={handleLogin}>登录 Warp</button>
      </div>
    </div>
  );
}

export default WarpLogin;
