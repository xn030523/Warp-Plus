import { useState } from "react";
import WarpLogin from "./components/WarpLogin";
import TempMail from "./components/TempMail";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("warp");

  return (
    <div className="app">
      <div className="sidebar">
        <h1>工具集</h1>
        <nav className="nav">
          <button 
            className={`nav-item ${activeTab === "warp" ? "active" : ""}`}
            onClick={() => setActiveTab("warp")}
          >
            Warp 上号
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
      </div>
    </div>
  );
}

export default App;
