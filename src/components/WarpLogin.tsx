import { useState, useMemo } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import './WarpLogin.css';

function WarpLogin() {
  const [refreshToken, setRefreshToken] = useState("");
  const [state, setState] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const handleLogin = async () => {
    if (!generatedUrl) return;
    
    try {
      // 使用 Tauri opener 插件打开 warp:// 协议链接
      await openUrl(generatedUrl);
    } catch (error) {
      console.error('打开链接失败:', error);
      alert(`打开链接失败: ${error}`);
    }
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

      {/* 使用教程 */}
      <div className="tutorial">
        <div className="tutorial-header">
          <h3>使用教程</h3>
          
          {/* 广告栏 */}
          <div className="ad-banner">
            <span className="ad-icon">🎁</span>
            <span className="ad-text">购买 Warp 2500 额度账户</span>
            <span className="ad-price">💰 <strong>1元</strong>/个</span>
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
        </div>
        
        <div className="tutorial-steps">
          <div className="tutorial-step">
            <div className="step-number">1</div>
            <img 
              src="/warp/1.png" 
              alt="步骤1" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/1.png')}
            />
            <div className="step-description">
              <h4>步骤一：打开 Warp 并登录</h4>
              <p>打开 Warp 终端，点击登录按钮，点击登录后关闭浏览器（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">2</div>
            <img 
              src="/warp/2.png" 
              alt="步骤2" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/2.png')}
            />
            <div className="step-description">
              <h4>步骤二：复制URL</h4>
              <p>复制完整的URL（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">3</div>
            <img 
              src="/warp/3.png" 
              alt="步骤3" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/3.png')}
            />
            <div className="step-description">
              <h4>步骤三：粘贴到图中输入框</h4>
              <p>将复制的信息粘贴到上方输入框（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">4</div>
            <img 
              src="/warp/4.png" 
              alt="步骤4" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/4.png')}
            />
            <div className="step-description">
              <h4>步骤四：复制Refresh Token</h4>
              <p>将任意额度的Refresh Token复制（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">5</div>
            <img 
              src="/warp/5.png" 
              alt="步骤5" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/5.png')}
            />
            <div className="step-description">
              <h4>步骤五：粘贴Refresh Token</h4>
              <p>吧获取到的Refresh Token 粘贴到图片输入框（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">6</div>
            <img 
              src="/warp/6.png" 
              alt="步骤6" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/6.png')}
            />
            <div className="step-description">
              <h4>步骤六：点击登录</h4>
              <p>点击登录后如图打开即可实现上号（点击图片放大查看）</p>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
          <div className="preview-content">
            <button className="preview-close" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="预览" className="preview-image" />
          </div>
        </div>
      )}
    </div>
  );
}

export default WarpLogin;
