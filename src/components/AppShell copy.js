// src/components/AppShell.js
import React, { useState, useEffect } from "react";

export default function AppShell({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // beforeinstallprompt 이벤트 처리
    const handleBeforeInstallPrompt = (e) => {
      // 기본 브라우저 설치 배너 방지
      e.preventDefault();
      console.log("PWA 설치 프롬프트 준비됨");

      // 이벤트 저장 및 커스텀 버튼 표시
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // 앱 설치 완료 이벤트 처리
    const handleAppInstalled = (e) => {
      console.log("PWA 설치 완료");
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    // 이벤트 리스너 등록
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 이미 설치되었는지 확인
    const checkIfInstalled = () => {
      const standalone = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;
      const isInWebAppiOS = window.navigator.standalone === true;
      const isInstalled = standalone || isInWebAppiOS;

      setIsInstalled(isInstalled);
      if (isInstalled) {
        setShowInstallButton(false);
      }
    };

    checkIfInstalled();

    // 정리 함수
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // 온라인/오프라인 상태 감지
    const updateStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log("설치 프롬프트가 준비되지 않았습니다");
      return;
    }

    try {
      // 설치 프롬프트 표시
      const promptResult = await deferredPrompt.prompt();
      console.log("프롬프트 결과:", promptResult);

      // 사용자 선택 결과 확인
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("사용자가 PWA 설치를 수락했습니다");
        setIsInstalled(true);
        setShowInstallButton(false);
      } else {
        console.log("사용자가 PWA 설치를 거부했습니다");
      }

      // 프롬프트 정리
      setDeferredPrompt(null);
    } catch (error) {
      console.error("PWA 설치 중 오류:", error);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* 상단 헤더 */}
      <header
        style={{
          background: "#1976D2",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🌐 더케이교직원나라</h1>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* PWA 설치 버튼 */}
          {showInstallButton && !isInstalled && (
            <button
              onClick={handleInstall}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#fff",
                color: "#1976D2",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "500",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.background = "#f5f5f5";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "#fff";
              }}
              title="앱으로 설치하여 더 편리하게 사용하세요"
            >
              📲 설치
            </button>
          )}

          {/* 설치 완료 표시 */}
          {isInstalled && (
            <span
              style={{
                fontSize: "0.85rem",
                background: "rgba(255,255,255,0.2)",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
              title="앱이 설치되었습니다"
            >
              ✅ 설치됨
            </span>
          )}

          {/* 온라인 상태 표시 */}
          <span
            style={{
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            title={isOnline ? "인터넷에 연결됨" : "오프라인 모드"}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isOnline ? "#4CAF50" : "#F44336",
                display: "inline-block",
              }}
            ></span>
            {isOnline ? "온라인" : "오프라인"}
          </span>
        </div>
      </header>

      {/* 오프라인 알림 배너 */}
      {!isOnline && (
        <div
          style={{
            background: "#FF9800",
            color: "white",
            padding: "8px 16px",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          ⚠️ 인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.
        </div>
      )}

      {/* 실제 콘텐츠 (기존 챗봇) */}
      <main style={{ flex: 1, overflow: "auto", background: "#f5f5f5" }}>
        {children}
      </main>
    </div>
  );
}
