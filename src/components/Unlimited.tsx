import React, { useState } from 'react';
import './Unlimited.css';

function Unlimited() {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  return (
    <div className="page-content">
      <h2>warp无限额度</h2>

      <div className="unlimited-card">
        <div className="unlimited-header">
<div className="badge">Stable</div>
          <div className="title">warp无限额度说明</div>
        </div>
        <div className="unlimited-body">

          <div className="pricing">
            <div className="price-card">
              <div className="price-title">周卡</div>
              <div className="price-value">¥30</div>
            </div>
            <div className="price-card">
              <div className="price-title">月卡</div>
              <div className="price-value">¥80</div>
            </div>
          </div>

          <div className="advantages">
            <h4>优势</h4>
            <ul>
              <li>无需频繁换号，直接持续对话</li>
              <li>额度不限，长对话上下文常在</li>
              <li>更稳定的使用体验</li>
            </ul>
          </div>

          <div className="compare">
            <div className="compare-col">
              <div className="compare-title">warp无限额度</div>
              <ul>
                <li>不限额度，长对话不断档</li>
                <li>无需换号，上下文连续保留</li>
              </ul>
            </div>
            <div className="compare-col">
              <div className="compare-title dim">原生账号</div>
              <ul>
                <li>额度有限，需看池子剩余</li>
                <li>换号后需清理/丢失上下文</li>
              </ul>
            </div>
          </div>

          <div className="media">
            <h4>示意图</h4>
<img src="/Unlimited/1.png" alt="无限额度示意图" className="un-image" onClick={() => setPreviewImage('/Unlimited/1.png')} />
          </div>
        </div>
        <div className="unlimited-actions">
          <a
            className="join-group-btn"
            href="https://qm.qq.com/q/vi1EFO0mxG"
            target="_blank"
            rel="noopener noreferrer"
          >
            加入交流群
          </a>
        </div>
      </div>

      {previewImage && (
        <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="预览" className="preview-image" />
            <button className="preview-close" onClick={() => setPreviewImage(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Unlimited;
