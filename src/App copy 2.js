// src/App.js
import React, { useEffect } from "react";
import AppShell from "./components/AppShell";
import { register } from "./serviceWorkerRegistration";
import CompanyRegulationsChatbot from "./CompanyRegulationsChatbot";

function App() {
  useEffect(() => {
    // Service Worker 등록
    register({
      onSuccess: () => {
        console.log("PWA가 오프라인 사용을 위해 준비되었습니다.");
      },
      onUpdate: (registration) => {
        console.log("새로운 업데이트가 있습니다.");
        // 사용자에게 업데이트 알림 (선택사항)
        if (window.confirm("새로운 버전이 있습니다. 업데이트하시겠습니까?")) {
          window.location.reload();
        }
      },
    });
  }, []);

  return (
    <AppShell>
      <CompanyRegulationsChatbot />
    </AppShell>
  );
}

export default App;
