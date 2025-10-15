import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import './TempMail.css';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  htmlContent: string;
  hasHtml: boolean;
  timestamp: number;
}

function TempMail() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  const generateEmail = async () => {
    setLoading(true);
    try {
      const newEmail = await invoke<string>("generate_temp_email");
      setEmail(newEmail);
      setEmails([]); // 清空旧邮件
    } catch (error) {
      console.error("生成邮箱失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email);
    }
  };

  const fetchEmails = async () => {
    if (!email) return;
    
    setRefreshing(true);
    try {
      const fetchedEmails = await invoke<Email[]>("get_emails", { email });
      setEmails(fetchedEmails);
    } catch (error) {
      console.error("获取邮件失败:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // 页面加载时自动生成邮箱
  useEffect(() => {
    generateEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 生成邮箱后自动刷新邮件
  useEffect(() => {
    if (!email) return;
    
    fetchEmails();
    const interval = setInterval(fetchEmails, 10000); // 每 10 秒刷新
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <div className="temp-mail page-content">
      <h2>临时邮箱</h2>
      
      <div className="mail-container">
        {/* 邮箱地址区 */}
        <div className="mail-header">
          <div className="email-card">
            <div className="email-label">当前邮箱地址</div>
            <div className="email-address-box">
              <span className="email-icon">📧</span>
              <span className="email-address">
                {loading && !email ? (
                  <span className="loading-text">
                    <span className="spinner-inline"></span>
                    生成中...
                  </span>
                ) : (
                  email || '未生成'
                )}
              </span>
              <button onClick={copyEmail} className="copy-btn-new" disabled={!email}>
                <span className="copy-icon">📋</span>
                复制
              </button>
            </div>
            <button onClick={generateEmail} className="refresh-btn" disabled={loading}>
              <span className="refresh-icon">↻</span>
              重新生成
            </button>
          </div>
        </div>

        {/* 邮件列表区 */}
        {email && (
          <div className="mail-list">
            <div className="mail-list-header">
              <h3>收件箱</h3>
              <div className="mail-actions">
                <span className="mail-count">{emails.length} 封邮件</span>
                <button onClick={fetchEmails} disabled={refreshing} className="refresh-mail-btn">
                  <span className={`refresh-icon-small ${refreshing ? 'spinning' : ''}`}>↻</span>
                  {refreshing ? '刷新中...' : '刷新'}
                </button>
              </div>
            </div>
            
            {emails.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📨</span>
                <p>暂无邮件</p>
                <small>邮件将自动显示在这里</small>
              </div>
            ) : (
              <div className="mail-items">
                {emails.map((mail) => (
                  <div key={mail.id} className="mail-card">
                    <div 
                      className={`mail-item ${expandedEmailId === mail.id ? 'expanded' : ''}`}
                      onClick={() => setExpandedEmailId(expandedEmailId === mail.id ? null : mail.id)}
                    >
                      <div className="mail-from">{mail.from}</div>
                      <div className="mail-subject">{mail.subject}</div>
                      <div className="mail-date">{new Date(mail.timestamp).toLocaleString('zh-CN')}</div>
                    </div>
                    
                    {expandedEmailId === mail.id && (
                      <div className="mail-detail">
                        <div className="mail-detail-meta">
                          <div className="detail-meta-item">
                            <span className="detail-label">发件人：</span>
                            <span>{mail.from}</span>
                          </div>
                          <div className="detail-meta-item">
                            <span className="detail-label">收件人：</span>
                            <span>{mail.to}</span>
                          </div>
                          <div className="detail-meta-item">
                            <span className="detail-label">时间：</span>
                            <span>{new Date(mail.timestamp).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                        <div className="mail-detail-body">
                          {mail.hasHtml ? (
                            <iframe 
                              srcDoc={mail.htmlContent}
                              className="mail-content-iframe"
                              title="邮件内容"
                              sandbox="allow-same-origin allow-scripts"
                            />
                          ) : (
                            <div className="mail-text-content">
                              {mail.content}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TempMail;
