import { useState } from "react";
import WarpLogin from "./components/WarpLogin";
import TempMail from "./components/TempMail";
import WarpUUID from "./components/WarpUUID";
import MCPManager from "./components/MCPManager";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("warp");

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Warp Plus</h1>
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
      </div>

      <div className="content">
        {activeTab === "warp" && <WarpLogin />}
        {activeTab === "temp-mail" && <TempMail />}
        {activeTab === "warp-uuid" && <WarpUUID />}
        {activeTab === "mcp" && <MCPManager />}
      </div>
    </div>
  );
}

export default App;
