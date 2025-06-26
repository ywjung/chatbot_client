import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CompanyRegulationsChatbot() {
  // PWA 관련 상태
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // 기존 챗봇 상태들
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `
안녕하세요! 저는 회사 내규 AI 어시스턴트입니다. 🏢

고급 벡터 검색과 AI를 결합하여 회사의 모든 내규에 대한 정확하고 신뢰할 수 있는 답변을 제공합니다. 

그러나 AI는 오류가 있을 수 있습니다. 경영지원팀 및 감사팀의 최종 확인을 받는 것을 권장합니다.

계약, 인사, 재무, 총무, IT, 컴플라이언스 등 모든 분야의 내규를 다룹니다. 무엇이든 물어보세요!
⚖️ 
`,
      isBot: true,
      timestamp: new Date(),
      startTime: Date.now(),
      endTime: Date.now(), // 초기 메시지는 즉시 완료
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ragServerStatus, setRagServerStatus] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [rulesSearchResults, setRulesSearchResults] = useState([]);
  const [rulesSearchTerm, setRulesSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState({});
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [expandedThinking, setExpandedThinking] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  const searchTimeoutRef = useRef(null);
  const rulesSearchInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const streamingScrollThrottleRef = useRef(null);
  const lastScrollTimeRef = useRef(0);

  // PWA 기능 초기화
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

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // PWA 설치 핸들러
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

  // 모바일 감지 및 뷰포트 높이 처리 개선
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      return mobile;
    };

    const updateViewportHeight = () => {
      const windowHeight = window.innerHeight;
      const visualHeight = window.visualViewport?.height || windowHeight;

      setViewportHeight(windowHeight);

      if (isMobile) {
        const heightDiff = windowHeight - visualHeight;
        setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
      } else {
        setKeyboardHeight(0);
      }
    };

    checkIsMobile();
    updateViewportHeight();

    const handleResize = () => {
      checkIsMobile();
      updateViewportHeight();
    };

    window.addEventListener("resize", handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewportHeight);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          updateViewportHeight
        );
      }
    };
  }, [isMobile]);

  // KaTeX CSS 및 개선된 테이블 스타일 로드
  useEffect(() => {
    const katexCSS = document.createElement("link");
    katexCSS.rel = "stylesheet";
    katexCSS.href =
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css";
    katexCSS.crossOrigin = "anonymous";
    document.head.appendChild(katexCSS);

    const customStyles = document.createElement("style");
    customStyles.textContent = `
      /* KaTeX 수식 스타일 */
      .katex-display {
        margin: 1em 0;
        overflow-x: auto;
        overflow-y: hidden;
        max-width: 100%;
        padding: 8px 0;
        border-radius: 6px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      
      .katex-display > .katex {
        white-space: nowrap;
        margin: 0 auto;
        display: block;
        text-align: center;
        min-width: max-content;
      }
      
      .katex {
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
      }
      
      .katex-inline {
        max-width: 100%;
        display: inline-block;
        vertical-align: middle;
      }
      
      /* 개선된 테이블 스타일링 */
      .markdown-table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 14px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
        background-color: white;
        border: 1px solid #e5e7eb;
      }
      
      .markdown-table thead {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      }
      
      .markdown-table th {
        padding: 8px 16px;
        text-align: left;
        font-weight: 600;
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        vertical-align: middle;
      }
      
      .markdown-table td {
        padding: 8px 16px;
        border-bottom: 1px solid #f3f4f6;
        color: #374151;
        line-height: 1.6;
        vertical-align: middle;
      }
      
      .markdown-table tbody tr:hover {
        background-color: #f8fafc;
        transition: background-color 0.2s ease;
      }
      
      .markdown-table tbody tr:last-child td {
        border-bottom: none;
        padding-bottom: 8px;
      }
      
      .markdown-table thead tr:first-child th {
        padding-top: 8px;
        padding-bottom: 8px;
      }
      
      .table-container {
        overflow-x: auto;
      }
      
      /* 애니메이션 - 부드러운 스크롤 개선 */
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      @keyframes pulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes fastPulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideInFromRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      @keyframes slideOutToRight {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
      }
      
      .dot:nth-child(1) { animation-delay: -0.32s; }
      .dot:nth-child(2) { animation-delay: -0.16s; }
      .dot:nth-child(3) { animation-delay: 0s; }
      
      /* 부드러운 스크롤 개선 */
      .messages-container {
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e0 #f7fafc;
        transition: scroll-behavior 0.3s ease;
      }
      
      .messages-container.streaming-mode {
        scroll-behavior: auto;
      }
      
      .messages-container::-webkit-scrollbar {
        width: 4px;
      }
      
      .messages-container::-webkit-scrollbar-track {
        background: #f7fafc;
        border-radius: 2px;
      }
      
      .messages-container::-webkit-scrollbar-thumb {
        background: #cbd5e0;
        border-radius: 2px;
        transition: background 0.2s ease;
      }
      
      .messages-container::-webkit-scrollbar-thumb:hover {
        background: #a0aec0;
      }
      
      .thinking-header:hover {
        background-color: #f1f5f9 !important;
      }
      
      .thinking-content {
        animation: slideIn 0.3s ease-out;
      }
      
      .scroll-button-appear {
        animation: fadeInScale 0.3s ease-out;
      }
      
      .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        animation: fadeInScale 0.3s ease-out;
      }
      
      .mobile-panel {
        animation: slideInFromRight 0.3s ease-out;
      }
      
      /* PWA 설치 버튼 애니메이션 */
      .install-button {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        animation: pulse 2s infinite;
      }
      
      .install-button:hover {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }
      
      .install-button:active {
        transform: translateY(0);
      }
      
      /* 설치 완료 배지 */
      .installed-badge {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      /* 모바일 반응형 스타일 */
      @media (max-width: 768px) {
        .markdown-table {
          font-size: 12px;
          margin: 12px 0;
        }
        
        .markdown-table th,
        .markdown-table td {
          padding: 6px 8px;
          font-size: 11px;
        }
        
        .katex-display {
          font-size: 0.9em;
          padding: 6px 4px;
          margin: 0.8em 0;
        }
        
        .katex {
          font-size: 0.85em;
        }
        
        .table-container {
          margin: 0 -8px;
        }
        
        .messages-container::-webkit-scrollbar {
          width: 2px;
        }
        
        .install-button {
          padding: 8px 12px;
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        .markdown-table {
          font-size: 11px;
        }
        
        .markdown-table th,
        .markdown-table td {
          padding: 4px 6px;
          font-size: 10px;
        }
        
        .katex-display {
          font-size: 0.8em;
          padding: 4px 2px;
        }
        
        .katex {
          font-size: 0.75em;
        }
      }
      
      .katex-display::-webkit-scrollbar,
      .table-container::-webkit-scrollbar {
        height: 3px;
      }
      
      .katex-display::-webkit-scrollbar-track,
      .table-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 2px;
      }
      
      .katex-display::-webkit-scrollbar-thumb,
      .table-container::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 2px;
      }
      
      .katex-display::-webkit-scrollbar-thumb:hover,
      .table-container::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(customStyles);

    return () => {
      if (document.head.contains(katexCSS)) {
        document.head.removeChild(katexCSS);
      }
      if (document.head.contains(customStyles)) {
        document.head.removeChild(customStyles);
      }
    };
  }, []);

  // HTML 태그를 JSX로 변환하는 함수
  const parseHtmlToJsx = useCallback((content) => {
    if (React.isValidElement(content)) {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((item, index) => (
        <React.Fragment key={index}>{parseHtmlToJsx(item)}</React.Fragment>
      ));
    }

    if (!content || typeof content !== "string") {
      return content;
    }

    const brRegex = /<br\s*\/?>/gi;
    if (!brRegex.test(content)) {
      return content;
    }

    const parts = content.split(brRegex);
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && <br />}
      </React.Fragment>
    ));
  }, []);

  // 테이블 셀 내용 처리 함수
  const processTableCellContent = useCallback(
    (children) => {
      if (typeof children === "string") {
        return parseHtmlToJsx(children);
      }

      if (Array.isArray(children)) {
        return children.map((child, index) => {
          if (typeof child === "string") {
            return (
              <React.Fragment key={index}>
                {parseHtmlToJsx(child)}
              </React.Fragment>
            );
          }
          if (
            React.isValidElement(child) &&
            child.props &&
            child.props.children
          ) {
            return React.cloneElement(child, {
              key: index,
              children: processTableCellContent(child.props.children),
            });
          }
          return <React.Fragment key={index}>{child}</React.Fragment>;
        });
      }

      if (
        React.isValidElement(children) &&
        children.props &&
        children.props.children
      ) {
        return React.cloneElement(children, {
          children: processTableCellContent(children.props.children),
        });
      }

      return children;
    },
    [parseHtmlToJsx]
  );

  // 카테고리 헬퍼 함수들
  const categoryHelpers = useMemo(() => {
    const getCategoryEmoji = (category) => {
      const emojiMap = {
        contract: "📝",
        hr: "👥",
        finance: "💰",
        general: "🏢",
        it: "💻",
        compliance: "⚖️",
        s2b: "🤝",
        s2b_business: "🤝",
        s2b_business1: "🌟",
        s2b_business2: "⭐",
        management_support: "📊",
        audit: "🔍",
        ebiz: "🛒",
        e_biz: "🛒",
        accounting: "📈",
        legal: "📜",
        procurement: "🛍️",
        sales: "💼",
        marketing: "📢",
        operations: "⚙️",
        security: "🔒",
        quality: "✅",
      };
      return emojiMap[category] || "📄";
    };

    const getCategoryName = (category) => {
      const nameMap = {
        contract: "계약",
        hr: "인사",
        finance: "재무",
        general: "총무",
        it: "IT",
        compliance: "컴플라이언스",
        s2b: "S2B사업",
        s2b_business: "S2B사업",
        s2b_business1: "S2B사업1팀",
        s2b_business2: "S2B사업2팀",
        management_support: "경영지원",
        audit: "감사",
        ebiz: "E-Biz",
        e_biz: "E-Biz",
        accounting: "회계",
        legal: "법무",
        procurement: "구매",
        sales: "영업",
        marketing: "마케팅",
        operations: "운영",
        security: "보안",
        quality: "품질",
      };
      return nameMap[category] || category;
    };

    return { getCategoryEmoji, getCategoryName };
  }, []);

  const { getCategoryEmoji, getCategoryName } = categoryHelpers;

  // <think> 태그 파싱 함수
  const parseMessageWithThinking = useCallback((text) => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let thinkingContent = null;

    while ((match = thinkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }
      thinkingContent = match[1].trim();
      lastIndex = thinkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return { parts, thinkingContent };
  }, []);

  // AI 사고 과정 요약 텍스트 생성 함수
  const generateThinkingSummary = useCallback(
    (thinkingContent, isStreaming = false) => {
      // </think> 태그가 있으면 사고 과정이 완료된 것으로 간주
      const isThinkingComplete =
        thinkingContent && thinkingContent.includes("</think>");

      if (isThinkingComplete || !isStreaming) {
        // 완료되면 고정 텍스트
        return "AI 사고 과정";
      }

      if (isStreaming) {
        // 스트리밍 중에는 마지막 문장 표시
        if (!thinkingContent || thinkingContent.trim() === "") {
          return "질문 분석 중...";
        }

        // </think> 태그 제거 후 처리
        const cleanContent = thinkingContent.replace(/<\/?think>/g, "").trim();

        // 마지막 문장 추출 (줄바꿈이나 마침표로 구분하고 빈 문자열 제거)
        const sentences = cleanContent
          .split(/[.\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1];
          if (lastSentence.length > 50) {
            return lastSentence.substring(0, 47) + "...";
          }
          return lastSentence;
        }

        return "질문 분석 중...";
      }

      return "AI 사고 과정";
    },
    []
  );

  // 토글 함수들
  const toggleContext = useCallback((messageId) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  const toggleThinking = useCallback((messageId) => {
    setExpandedThinking((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  // 개선된 스크롤 함수 - 사용자 의도 존중
  const scrollToBottom = useCallback(
    (options = {}) => {
      const {
        behavior = "smooth",
        force = false,
        delay = 0,
        instant = false,
        silent = false,
        throttle = false,
      } = options;

      // 스트리밍 중 스크롤 쓰로틀링
      if (throttle && isStreaming) {
        const now = Date.now();
        if (now - lastScrollTimeRef.current < 100) {
          // 100ms 쓰로틀링
          return;
        }
        lastScrollTimeRef.current = now;
      }

      const executeScroll = () => {
        if (!messagesContainerRef.current) return;

        const container = messagesContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        // force가 false이고 사용자가 스크롤 중이거나 자동 스크롤이 비활성화되어 있으면 스크롤하지 않음
        if (!force && (isUserScrollingRef.current || !shouldAutoScroll)) {
          return;
        }

        // force가 true이거나, 자동 스크롤이 활성화되어 있고 맨 아래 근처에 있을 때만 스크롤
        if (force || (shouldAutoScroll && (isNearBottom || isStreaming))) {
          const targetScrollTop =
            container.scrollHeight - container.clientHeight;

          if (instant || (isStreaming && throttle)) {
            // 스트리밍 중에는 부드럽게 스크롤하되 쓰로틀링 적용
            container.scrollTop = targetScrollTop;
          } else {
            container.scrollTo({
              top: targetScrollTop,
              behavior: isStreaming ? "auto" : behavior,
            });
          }

          if (!silent) {
            setShouldAutoScroll(true);
          }
        }
      };

      if (delay > 0) {
        setTimeout(executeScroll, delay);
      } else {
        // 스트리밍 중에는 requestAnimationFrame 사용하지 않음
        if (isStreaming && throttle) {
          executeScroll();
        } else {
          requestAnimationFrame(executeScroll);
        }
      }
    },
    [shouldAutoScroll, isStreaming]
  );

  // 개선된 스크롤 이벤트 핸들러 - 사용자 스크롤 존중
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    isUserScrollingRef.current = true;

    // 즉시 스크롤 위치 확인
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // 사용자가 위로 스크롤했으면 자동 스크롤 중단
    if (!isNearBottom) {
      setShouldAutoScroll(false);
    } else if (isNearBottom) {
      // 맨 아래 근처에 있으면 자동 스크롤 활성화
      setShouldAutoScroll(true);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;

      // 타이머 후에도 위치 재확인
      const container = messagesContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      setShouldAutoScroll(isNearBottom);
    }, 300); // 더 긴 지연시간으로 사용자 스크롤 완료 대기
  }, []);

  // 메시지 변경 시 스크롤 처리 - 개선된 버전
  useEffect(() => {
    if (messages.length === 0) return;

    if (isStreaming) {
      // 스트리밍 중에는 쓰로틀된 스크롤 사용
      scrollToBottom({
        instant: true,
        force: true,
        silent: true,
        throttle: true,
      });
    } else if (shouldAutoScroll) {
      // 스트리밍이 끝났을 때만 부드러운 스크롤
      scrollToBottom({
        behavior: "smooth",
        delay: 100,
        force: false,
      });
    }
  }, [messages, scrollToBottom, shouldAutoScroll, isStreaming]);

  // 스트리밍 상태 변경 시 스크롤 제어 - 개선된 버전
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isStreaming || isTyping) {
      // 스트리밍 시작 시, 사용자가 맨 아래에 있을 때만 자동 스크롤 활성화
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        setShouldAutoScroll(true);
        isUserScrollingRef.current = false;
      }
      // 사용자가 위에서 읽고 있으면 자동 스크롤하지 않음

      // 스트리밍 모드 클래스 추가
      container.classList.add("streaming-mode");

      // 맨 아래에 있을 때만 스크롤
      if (isNearBottom) {
        scrollToBottom({
          instant: true,
          force: false, // force를 false로 변경
          silent: true,
          throttle: true,
        });
      }
    } else {
      // 스트리밍이 끝나면 부드러운 스크롤 모드로 복원
      container.classList.remove("streaming-mode");

      // 스트리밍 종료 후, 자동 스크롤이 활성화된 상태일 때만 최종 스크롤
      if (shouldAutoScroll) {
        setTimeout(() => {
          scrollToBottom({
            behavior: "smooth",
            force: false, // force를 false로 변경
          });
        }, 200);
      }
    }
  }, [isStreaming, isTyping, scrollToBottom, shouldAutoScroll]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    const scrollTimeout = scrollTimeoutRef.current;
    const searchTimeout = searchTimeoutRef.current;
    const streamingThrottle = streamingScrollThrottleRef.current;

    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (streamingThrottle) {
        clearTimeout(streamingThrottle);
      }
    };
  }, []);

  // RAG 서버 상태 확인
  const checkRagServerStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        setRagServerStatus(data);
        console.log("RAG 서버 상태:", data);
      } else {
        setRagServerStatus({
          status: "error",
          rag_ready: false,
          regulations_count: 0,
        });
      }
    } catch (error) {
      console.error("RAG 서버 상태 확인 오류:", error);
      setRagServerStatus({
        status: "error",
        rag_ready: false,
        regulations_count: 0,
      });
    }
  }, []);

  // 카테고리 정보 가져오기
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || {});
        console.log("카테고리 정보:", data.categories);
      } else {
        console.error("카테고리 정보 가져오기 실패:", response.status);
      }
    } catch (error) {
      console.error("카테고리 정보 가져오기 오류:", error);
    }
  }, []);

  useEffect(() => {
    checkRagServerStatus();
    fetchCategories();
    const interval = setInterval(() => {
      checkRagServerStatus();
      fetchCategories();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkRagServerStatus, fetchCategories]);

  // 회사 내규 검색
  const searchRegulations = useCallback(
    async (searchTerm) => {
      if (!searchTerm.trim() || searchTerm.trim().length < 2) {
        setRulesSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchTerm,
            top_k: 5,
            main_category_filter: selectedMainCategory || null,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          setRulesSearchResults(data.results || []);
        } else {
          console.error("회사 내규 검색 실패:", response.status);
          setRulesSearchResults([]);
        }
      } catch (error) {
        console.error("회사 내규 검색 오류:", error);
        setRulesSearchResults([]);
      } finally {
        setIsSearching(false);
        setTimeout(() => {
          if (rulesSearchInputRef.current) {
            rulesSearchInputRef.current.focus();
          }
        }, 100);
      }
    },
    [selectedMainCategory]
  );

  // 디바운싱된 검색
  const debouncedSearch = useCallback(
    (searchTerm) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchRegulations(searchTerm);
      }, 500);
    },
    [searchRegulations]
  );

  // 회사 내규 검색어 입력 핸들러
  const handleRulesSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setRulesSearchTerm(value);

      if (!value.trim()) {
        setRulesSearchResults([]);
        setIsSearching(false);
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        return;
      }

      if (value.trim().length < 2) {
        setRulesSearchResults([]);
        setIsSearching(false);
        return;
      }

      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  // 회사 내규를 채팅에 적용
  const applyRegulationToChat = useCallback(
    (regulation) => {
      const now = Date.now();
      const regulationMessage = {
        id: Date.now(),
        text: `${getCategoryEmoji(regulation.main_category)} **${
          regulation.question
        }**\n\n${regulation.answer}\n\n*출처: ${getCategoryName(
          regulation.main_category
        )} > ${regulation.sub_category}*`,
        isBot: true,
        timestamp: new Date(),
        startTime: now,
        endTime: now, // 내규 검색 결과는 즉시 표시
        isRule: true,
      };

      setMessages((prev) => [...prev, regulationMessage]);
      setShowRulesPanel(false);
      setShowMobileMenu(false);
      setRulesSearchTerm("");
      setRulesSearchResults([]);
      setShouldAutoScroll(true);
    },
    [getCategoryEmoji, getCategoryName]
  );

  // RAG 기반 스트리밍 API 호출 함수
  const callRAGAPIStream = useCallback(
    async (userMessage) => {
      try {
        const response = await fetch("/api/chat_stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reranker_type: "qwen3",
            query: userMessage,
            main_category_filter: selectedMainCategory || null,
            conversation_history: conversationHistory,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        console.error("RAG 스트리밍 API 호출 오류:", error);
        throw error;
      }
    },
    [selectedMainCategory, conversationHistory]
  );

  // 스트리밍 응답 처리 - 개선된 버전
  const handleStreamingResponse = useCallback(
    (userMessage) => {
      const userMessageObj = {
        id: Date.now(),
        text: userMessage,
        isBot: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessageObj]);

      const newUserHistory = {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      setInputText("");
      setIsTyping(true);
      setIsStreaming(true);
      setShouldAutoScroll(true);

      const botMessageId = Date.now() + 1;

      const initialBotMessage = {
        id: botMessageId,
        text: "",
        isBot: true,
        timestamp: new Date(),
        startTime: Date.now(), // 처리 시작 시간 기록
        context: [],
        contextCount: 0,
        isRAG: false,
        isStreaming: true,
        thinkingContent: "", // 스트리밍 중 사고 과정 저장
      };

      setMessages((prev) => [...prev, initialBotMessage]);

      if (textareaRef.current) {
        textareaRef.current.style.height = isMobile ? "44px" : "48px";
      }

      // 초기 스크롤은 지연 없이
      setTimeout(() => scrollToBottom({ instant: true, force: true }), 50);

      // 가상의 스트리밍 응답 (실제 서버 연결 시 이 부분을 RAG API로 대체)
      const simulateStreamingResponse = () => {
        const sampleResponse = `안녕하세요! 귀하의 질문 "${userMessage}"에 대해 답변드리겠습니다.

## 주요 내용

이것은 테스트 응답입니다. 실제 RAG 서버와 연결되면 회사 내규에 기반한 정확한 답변을 제공합니다.

### 세부 정보

| 구분 | 내용 | 비고 |
|------|------|------|
| 처리 시간 | 1-3일 | 업무일 기준 |
| 승인 권한 | 팀장 이상 | 대리결재 가능 |
| 필요 서류 | 신청서, 증빙 | 사전 제출 필수 |

더 자세한 정보가 필요하시면 언제든 말씀해 주세요!`;

        const sampleThinking = `사용자가 "${userMessage}"에 대해 질문했습니다.

이 질문을 분석해보겠습니다.
회사 내규와 관련된 질문인지 확인 중입니다.
적절한 카테고리 분류가 필요합니다.
RAG 검색을 통해 관련 내규를 찾겠습니다.
정확하고 도움이 되는 답변을 구성하겠습니다.
</think>`;

        let currentText = "";
        let currentThinking = "";
        let index = 0;
        let thinkingIndex = 0;
        let scrollCounter = 0;
        let isThinkingComplete = false;

        const addCharacter = () => {
          // 먼저 thinking 내용을 점진적으로 추가
          if (!isThinkingComplete && thinkingIndex < sampleThinking.length) {
            currentThinking += sampleThinking[thinkingIndex];

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? { ...msg, thinkingContent: currentThinking }
                  : msg
              )
            );

            thinkingIndex++;

            // </think> 태그가 완료되었는지 확인
            if (currentThinking.includes("</think>")) {
              isThinkingComplete = true;
              // 사고 과정이 완료되어도 thinkingContent는 보존
              // 사고 과정 완료 후 약간의 지연
              setTimeout(addCharacter, 500);
              return;
            }

            setTimeout(addCharacter, 20);
            return;
          }

          // thinking이 완료된 후 실제 응답 시작
          if (index < sampleResponse.length) {
            currentText += sampleResponse[index];

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? { ...msg, text: currentText, isRAG: true }
                  : msg
              )
            );

            // 스크롤 빈도 줄이기 - 매 10글자마다만 스크롤하고 사용자 스크롤 존중
            scrollCounter++;
            if (
              scrollCounter % 10 === 0 &&
              shouldAutoScroll &&
              !isUserScrollingRef.current
            ) {
              scrollToBottom({
                instant: true,
                force: false, // 사용자 의도 존중
                silent: true,
                throttle: true,
              });
            }

            index++;
            setTimeout(addCharacter, 30);
          } else {
            setIsTyping(false);
            setIsStreaming(false);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      isStreaming: false,
                      endTime: Date.now(), // 시뮬레이션 완료 시 endTime 기록
                    }
                  : msg
              )
            );

            const newBotHistory = {
              role: "assistant",
              content: currentText,
              context: [],
              timestamp: new Date().toISOString(),
            };

            setConversationHistory((prev) => [
              ...prev,
              newUserHistory,
              newBotHistory,
            ]);

            // 스트리밍 완료 후 최종 부드러운 스크롤
            setTimeout(() => {
              scrollToBottom({ behavior: "smooth", force: true });
            }, 300);
          }
        };

        addCharacter();
      };

      // 실제 RAG 서버 연결 시도, 실패하면 시뮬레이션 실행
      callRAGAPIStream(userMessage)
        .then((response) => {
          // 실제 스트리밍 처리 로직
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let botResponseText = "";
          let currentContext = [];
          let streamCounter = 0;
          let currentThinking = null; // 사고 과정 추적을 위한 변수

          const processStream = () => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  setIsTyping(false);
                  setIsStreaming(false);

                  // 스트리밍 완료 시 endTime 기록
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? {
                            ...msg,
                            isStreaming: false,
                            endTime: Date.now(),
                          }
                        : msg
                    )
                  );

                  if (botResponseText.trim()) {
                    const newBotHistory = {
                      role: "assistant",
                      content: botResponseText,
                      context: currentContext,
                      timestamp: new Date().toISOString(),
                    };

                    setConversationHistory((prev) => [
                      ...prev,
                      newUserHistory,
                      newBotHistory,
                    ]);
                  }

                  // 스트리밍 완료 후 최종 스크롤
                  setTimeout(() => {
                    scrollToBottom({ behavior: "smooth", force: false }); // 사용자 의도 존중
                  }, 300);
                  return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                lines.forEach((line) => {
                  if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6);
                    if (dataStr.trim() === "") return;

                    try {
                      const data = JSON.parse(dataStr);

                      if (data.type === "thinking") {
                        // 사고 과정 스트리밍 처리
                        currentThinking += data.content || "";
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === botMessageId
                              ? { ...msg, thinkingContent: currentThinking }
                              : msg
                          )
                        );

                        // </think> 태그가 감지되면 사고 과정 완료로 처리
                        if (currentThinking.includes("</think>")) {
                          // 여기서 추가 처리가 필요하다면 추가
                        }
                      } else if (data.type === "context") {
                        currentContext = data.context || [];
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === botMessageId
                              ? {
                                  ...msg,
                                  context: data.context,
                                  contextCount: data.context_count,
                                  isRAG: data.context_count > 0,
                                }
                              : msg
                          )
                        );
                        scrollToBottom({
                          instant: true,
                          force: false, // 사용자 의도 존중
                          silent: true,
                          throttle: true,
                        });
                      } else if (data.type === "content") {
                        const content = data.content;

                        // <think> 태그가 포함된 내용인지 실시간 감지
                        if (
                          content.includes("<think>") ||
                          currentThinking !== null ||
                          content.includes("</think>")
                        ) {
                          // 사고 과정 처리
                          if (content.includes("<think>")) {
                            // 사고 과정 시작
                            const thinkStart = content.indexOf("<think>");
                            const beforeThink = content.substring(
                              0,
                              thinkStart
                            );
                            const afterThinkStart = content.substring(
                              thinkStart + 7
                            ); // '<think>' 길이만큼 제거

                            // 사고 과정 이전의 내용이 있으면 본문에 추가
                            if (beforeThink) {
                              botResponseText += beforeThink;
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === botMessageId
                                    ? { ...msg, text: msg.text + beforeThink }
                                    : msg
                                )
                              );
                            }

                            // 사고 과정 시작
                            currentThinking = afterThinkStart;
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === botMessageId
                                  ? { ...msg, thinkingContent: currentThinking }
                                  : msg
                              )
                            );
                          } else if (content.includes("</think>")) {
                            // 사고 과정 종료
                            const thinkEnd = content.indexOf("</think>");
                            const beforeThinkEnd = content.substring(
                              0,
                              thinkEnd
                            );
                            const afterThink = content.substring(thinkEnd + 8); // '</think>' 길이만큼 제거

                            // 사고 과정 마지막 부분 추가
                            if (currentThinking !== null) {
                              currentThinking += beforeThinkEnd;

                              // 사고 과정 최종 업데이트 (</think> 태그 포함하여 완료 표시)
                              const finalThinkingContent =
                                currentThinking + "</think>";
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === botMessageId
                                    ? {
                                        ...msg,
                                        thinkingContent: finalThinkingContent,
                                      }
                                    : msg
                                )
                              );
                            }

                            // 사고 과정 종료 후의 내용이 있으면 본문에 추가
                            if (afterThink) {
                              botResponseText += afterThink;
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === botMessageId
                                    ? { ...msg, text: msg.text + afterThink }
                                    : msg
                                )
                              );
                            }

                            // 사고 과정 완료 - currentThinking만 null로 설정 (메시지의 thinkingContent는 보존)
                            currentThinking = null;
                          } else if (currentThinking !== null) {
                            // 사고 과정 중간 내용
                            currentThinking += content;
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === botMessageId
                                  ? { ...msg, thinkingContent: currentThinking }
                                  : msg
                              )
                            );
                          }
                        } else {
                          // 일반 응답 내용
                          botResponseText += content;
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === botMessageId
                                ? { ...msg, text: msg.text + content }
                                : msg
                            )
                          );
                        }

                        // 스트리밍 중 스크롤 빈도 조절 및 사용자 의도 존중
                        streamCounter++;
                        if (
                          streamCounter % 5 === 0 &&
                          shouldAutoScroll &&
                          !isUserScrollingRef.current
                        ) {
                          // 매 5번째 청크마다만 스크롤
                          scrollToBottom({
                            instant: true,
                            force: false, // 사용자 의도 존중
                            silent: true,
                            throttle: true,
                          });
                        }
                      } else if (
                        data.type === "done" ||
                        data.type === "stream_end"
                      ) {
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === botMessageId
                              ? {
                                  ...msg,
                                  isStreaming: false,
                                  endTime: Date.now(), // 처리 완료 시간 기록
                                }
                              : msg
                          )
                        );
                        setIsTyping(false);
                        setIsStreaming(false);

                        setTimeout(() => {
                          scrollToBottom({ behavior: "smooth", force: false }); // 사용자 의도 존중
                        }, 200);

                        if (botResponseText.trim()) {
                          const newBotHistory = {
                            role: "assistant",
                            content: botResponseText,
                            context: currentContext,
                            timestamp: new Date().toISOString(),
                          };

                          setConversationHistory((prev) => [
                            ...prev,
                            newUserHistory,
                            newBotHistory,
                          ]);
                        }
                        return;
                      }
                    } catch (e) {
                      console.error("JSON 파싱 오류:", e);
                    }
                  }
                });

                processStream();
              })
              .catch((error) => {
                console.error("스트림 읽기 오류:", error);
                setIsTyping(false);
                setIsStreaming(false);

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? {
                          ...msg,
                          text: "연결 오류가 발생했습니다. 다시 시도해 주세요.",
                          isStreaming: false,
                          endTime: Date.now(), // 오류 시에도 endTime 기록
                        }
                      : msg
                  )
                );

                scrollToBottom({ behavior: "smooth", force: true });
              });
          };

          processStream();
        })
        .catch((error) => {
          console.error("스트리밍 연결 오류:", error);
          // RAG 서버 연결 실패 시 시뮬레이션 실행
          simulateStreamingResponse();
        });
    },
    [callRAGAPIStream, setConversationHistory, scrollToBottom, isMobile]
  );

  // 메시지 전송
  const sendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isTyping || isStreaming) {
      return;
    }

    setShouldAutoScroll(true);
    handleStreamingResponse(trimmedInput);
  }, [inputText, isTyping, isStreaming, handleStreamingResponse]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  const formatTime = useCallback((date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // 처리 시간 계산 함수 추가
  const getProcessingTime = useCallback((message) => {
    if (message.startTime && message.endTime) {
      const duration = (message.endTime - message.startTime) / 1000; // 밀리초를 초로 변환
      return duration.toFixed(1); // 소수점 첫째 자리까지 표시
    }
    return null;
  }, []);

  const getRagStatusText = useCallback(() => {
    if (!ragServerStatus) return "서버 확인 중...";
    if (ragServerStatus.rag_ready)
      return `RAG 준비완료 (${
        ragServerStatus.regulations_count || ragServerStatus.rules_count || 0
      }개 내규)`;
    return "RAG 서버 연결 실패";
  }, [ragServerStatus]);

  const testRagServer = useCallback(async () => {
    console.log("회사 내규 RAG 서버 테스트 시작...");
    const testMessage = selectedMainCategory
      ? `${getCategoryName(
          selectedMainCategory
        )} 관련 내규 중에서 가장 중요한 절차는 무엇인가요? 단계별로 자세히 설명하고 관련 수식이 있다면 포함해주세요.`
      : "회사의 교육 연수 관리와 출장비 처리 절차는 어떻게 되나요? 수식도 포함해서 설명해주세요.";

    handleStreamingResponse(testMessage);
  }, [selectedMainCategory, getCategoryName, handleStreamingResponse]);

  // 카테고리 선택 핸들러
  const handleCategorySelect = useCallback((category) => {
    setSelectedMainCategory(category);
    setShowCategoryFilter(false);
  }, []);

  // 모바일 메뉴 토글
  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu(!showMobileMenu);
    if (!showMobileMenu) {
      setShowRulesPanel(true);
    } else {
      setShowRulesPanel(false);
    }
  }, [showMobileMenu]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCategoryFilter && !event.target.closest(".category-filter")) {
        setShowCategoryFilter(false);
      }
      if (
        isMobile &&
        showMobileMenu &&
        !event.target.closest(".mobile-panel") &&
        !event.target.closest(".mobile-menu-button")
      ) {
        setShowMobileMenu(false);
        setShowRulesPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCategoryFilter, showMobileMenu, isMobile]);

  // Markdown 렌더링 컴포넌트들
  const MarkdownComponents = useMemo(() => {
    const headingStyles = {
      1: {
        fontSize: isMobile ? "1.5rem" : "1.875rem",
        fontWeight: "800",
        margin: isMobile ? "16px 0 12px 0" : "24px 0 16px 0",
        color: "#111827",
        borderBottom: "3px solid #e5e7eb",
        paddingBottom: isMobile ? "6px" : "10px",
      },
      2: {
        fontSize: isMobile ? "1.25rem" : "1.5rem",
        fontWeight: "700",
        margin: isMobile ? "14px 0 8px 0" : "20px 0 12px 0",
        color: "#1f2937",
        borderBottom: "2px solid #f3f4f6",
        paddingBottom: isMobile ? "4px" : "6px",
      },
      3: {
        fontSize: isMobile ? "1.125rem" : "1.25rem",
        fontWeight: "600",
        margin: isMobile ? "12px 0 6px 0" : "18px 0 10px 0",
        color: "#374151",
      },
    };

    return {
      h1: ({ node, ...props }) => (
        <h1 style={headingStyles[1]} {...props}>
          {props.children}
        </h1>
      ),
      h2: ({ node, ...props }) => (
        <h2 style={headingStyles[2]} {...props}>
          {props.children}
        </h2>
      ),
      h3: ({ node, ...props }) => (
        <h3 style={headingStyles[3]} {...props}>
          {props.children}
        </h3>
      ),
      p: ({ node, ...props }) => (
        <p
          style={{
            margin: isMobile ? "6px 0" : "8px 0",
            lineHeight: "1.75",
            color: "#374151",
            fontSize: isMobile ? "14px" : "15px",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
          {...props}
        >
          {processTableCellContent(props.children)}
        </p>
      ),
      ul: ({ node, ...props }) => (
        <ul
          style={{
            margin: isMobile ? "8px 0" : "12px 0",
            paddingLeft: isMobile ? "18px" : "24px",
            lineHeight: "1.7",
            color: "#374151",
            fontSize: isMobile ? "14px" : "15px",
          }}
          {...props}
        >
          {props.children}
        </ul>
      ),
      ol: ({ node, ...props }) => (
        <ol
          style={{
            margin: isMobile ? "8px 0" : "12px 0",
            paddingLeft: isMobile ? "20px" : "28px",
            lineHeight: "1.7",
            color: "#374151",
            fontSize: isMobile ? "14px" : "15px",
          }}
          {...props}
        >
          {props.children}
        </ol>
      ),
      li: ({ node, ...props }) => (
        <li
          style={{
            margin: isMobile ? "2px 0" : "4px 0",
            lineHeight: "1.7",
            color: "#374151",
          }}
          {...props}
        >
          {processTableCellContent(props.children)}
        </li>
      ),
      blockquote: ({ node, ...props }) => (
        <blockquote
          style={{
            margin: isMobile ? "12px 0" : "16px 0",
            padding: isMobile ? "12px 16px" : "16px 20px",
            borderLeft: "4px solid #3b82f6",
            backgroundColor: "#f8fafc",
            borderRadius: "0 8px 8px 0",
            fontStyle: "italic",
            color: "#4b5563",
          }}
          {...props}
        >
          {props.children}
        </blockquote>
      ),
      table: ({ node, ...props }) => (
        <div className="table-container">
          <table className="markdown-table" {...props}>
            {props.children}
          </table>
        </div>
      ),
      thead: ({ node, ...props }) => <thead {...props}>{props.children}</thead>,
      tbody: ({ node, ...props }) => <tbody {...props}>{props.children}</tbody>,
      tr: ({ node, ...props }) => <tr {...props}>{props.children}</tr>,
      th: ({ node, ...props }) => (
        <th {...props}>{processTableCellContent(props.children)}</th>
      ),
      td: ({ node, ...props }) => (
        <td {...props}>{processTableCellContent(props.children)}</td>
      ),
      code: ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <div
            style={{
              margin: isMobile ? "12px 0" : "16px 0",
              borderRadius: isMobile ? "8px" : "12px",
              overflow: "hidden",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              maxWidth: "100%",
            }}
          >
            <SyntaxHighlighter
              style={dracula}
              language={match[1]}
              PreTag="pre"
              {...props}
              customStyle={{
                margin: "0",
                padding: isMobile ? "12px" : "16px",
                fontSize: isMobile ? "12px" : "14px",
                lineHeight: "1.6",
                overflowX: "auto",
                maxWidth: "100%",
              }}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        ) : (
          <code
            style={{
              backgroundColor: "#f1f5f9",
              color: "#dc2626",
              padding: isMobile ? "2px 6px" : "3px 8px",
              borderRadius: isMobile ? "4px" : "6px",
              fontSize: isMobile ? "12px" : "13px",
              fontFamily: "Monaco, Consolas, monospace",
              wordBreak: "break-all",
            }}
            {...props}
          >
            {children}
          </code>
        );
      },
      strong: ({ node, ...props }) => (
        <strong
          style={{
            fontWeight: "700",
            color: "#1f2937",
          }}
          {...props}
        >
          {props.children}
        </strong>
      ),
      em: ({ node, ...props }) => (
        <em
          style={{
            fontStyle: "italic",
            color: "#4b5563",
          }}
          {...props}
        >
          {props.children}
        </em>
      ),
    };
  }, [processTableCellContent, isMobile]);

  // 컨테이너 높이 계산
  const containerHeight = useMemo(() => {
    if (isMobile) {
      return viewportHeight - keyboardHeight;
    }
    return "100vh";
  }, [isMobile, viewportHeight, keyboardHeight]);

  // 입력 영역 높이 계산
  const inputAreaHeight = useMemo(() => {
    return isMobile ? 120 : 140; // 입력창 + 패딩 + 안내문구 높이
  }, [isMobile]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: containerHeight,
        maxWidth: isMobile ? "100%" : "1200px",
        margin: "0 auto",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 오프라인 알림 배너 */}
      {!isOnline && (
        <div
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white",
            padding: isMobile ? "8px 16px" : "10px 20px",
            fontSize: isMobile ? "12px" : "14px",
            textAlign: "center",
            fontWeight: "600",
            borderBottom: "2px solid #92400e",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <span>⚠️</span>
          <span>
            인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.
          </span>
          <span>📱</span>
        </div>
      )}

      {/* 모바일 오버레이 */}
      {isMobile && showMobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => {
            setShowMobileMenu(false);
            setShowRulesPanel(false);
          }}
        />
      )}

      {/* 헤더 - PWA 기능 통합 */}
      <div
        style={{
          background: "white",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #e5e7eb",
          padding: isMobile ? "12px 16px" : "16px",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "8px" : "12px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: isMobile ? "36px" : "40px",
                height: isMobile ? "36px" : "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "50%",
                color: "white",
                fontSize: isMobile ? "16px" : "20px",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <div style={{ position: "relative" }}>
                💼
                <div
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: isMobile ? "6px" : "8px",
                    height: isMobile ? "6px" : "8px",
                    background: "linear-gradient(45deg, #fbbf24, #f59e0b)",
                    borderRadius: "50%",
                    border: "1px solid white",
                    animation: "pulse 2s infinite",
                  }}
                />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? "6px" : "8px",
                }}
              >
                <h1
                  style={{
                    fontSize: isMobile ? "16px" : "20px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  {isMobile ? "내규 챗봇" : "회사 내규 챗봇"}
                </h1>
                {!isMobile && (
                  <button
                    onClick={testRagServer}
                    disabled={isTyping}
                    style={{
                      padding: "6px 10px",
                      fontSize: "12px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      background: isTyping
                        ? "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)"
                        : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                      color: isTyping ? "#9ca3af" : "#6b7280",
                      cursor: isTyping ? "not-allowed" : "pointer",
                      opacity: isTyping ? 0.5 : 1,
                      transition: "all 0.3s ease",
                      fontWeight: "500",
                    }}
                  >
                    🎯 테스트
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: isMobile ? "11px" : "14px",
                  color: ragServerStatus?.rag_ready ? "#059669" : "#dc2626",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {isMobile
                  ? "벡터검색+AI 내규시스템"
                  : "벡터 검색 + AI 융합 회사 내규 전문 시스템"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: isMobile ? "4px" : "8px",
              alignItems: "center",
            }}
          >
            {/* PWA 설치 버튼 또는 설치 완료 표시 */}
            {!isMobile && showInstallButton && !isInstalled && (
              <button
                onClick={handleInstall}
                className="install-button"
                title="앱으로 설치하여 더 편리하게 사용하세요"
              >
                📲 앱 설치
              </button>
            )}

            {!isMobile && isInstalled && (
              <div className="installed-badge" title="앱이 설치되었습니다">
                ✅ 설치됨
              </div>
            )}

            {/* 모바일에서는 햄버거 메뉴 */}
            {isMobile ? (
              <button
                className="mobile-menu-button"
                onClick={toggleMobileMenu}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  background: showMobileMenu
                    ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  color: showMobileMenu ? "white" : "#3b82f6",
                  border: showMobileMenu
                    ? "2px solid #60a5fa"
                    : "2px solid #3b82f6",
                  borderRadius: "12px",
                  fontSize: "20px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                {showMobileMenu ? "✖️" : "☰"}
              </button>
            ) : (
              /* 데스크톱 메뉴 */
              <>
                {/* 카테고리 필터 */}
                <div
                  style={{ position: "relative" }}
                  className="category-filter"
                >
                  <button
                    onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      background: selectedMainCategory
                        ? "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)"
                        : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                      color: selectedMainCategory ? "#1e40af" : "#374151",
                      border: selectedMainCategory
                        ? "2px solid #93c5fd"
                        : "1px solid #d1d5db",
                      borderRadius: "12px",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedMainCategory ? (
                      <>
                        {getCategoryEmoji(selectedMainCategory)}{" "}
                        {getCategoryName(selectedMainCategory)}
                      </>
                    ) : (
                      <>📂 전체 내규</>
                    )}
                    {showCategoryFilter ? " ▲" : " ▼"}
                  </button>

                  {showCategoryFilter && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: "0",
                        marginTop: "4px",
                        backgroundColor: "white",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        zIndex: 20,
                        minWidth: "280px",
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          borderBottom: "1px solid #f3f4f6",
                          transition: "backgroundColor 0.2s ease",
                          backgroundColor: !selectedMainCategory
                            ? "#f3f4f6"
                            : "white",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => handleCategorySelect("")}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>📂</span>
                          <span>전체 내규</span>
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            ({categories.total_regulations || 0}개)
                          </span>
                        </div>
                      </div>

                      {categories.main_categories &&
                        Object.entries(categories.main_categories).map(
                          ([categoryKey, categoryInfo]) => (
                            <div
                              key={categoryKey}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontSize: "14px",
                                borderBottom: "1px solid #f3f4f6",
                                transition: "backgroundColor 0.2s ease",
                                backgroundColor:
                                  selectedMainCategory === categoryKey
                                    ? "#f3f4f6"
                                    : "white",
                                whiteSpace: "nowrap",
                              }}
                              onClick={() => handleCategorySelect(categoryKey)}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <span>{getCategoryEmoji(categoryKey)}</span>
                                <span>{getCategoryName(categoryKey)}</span>
                                <span
                                  style={{ fontSize: "12px", color: "#6b7280" }}
                                >
                                  ({categoryInfo.total_faqs}개)
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#9ca3af",
                                  marginTop: "2px",
                                }}
                              >
                                {categoryInfo.sub_categories}개 소구분 |{" "}
                                {categoryInfo.file_name.replace(/\.json$/i, "")}
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  )}
                </div>

                <button
                  onClick={checkRagServerStatus}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: ragServerStatus?.rag_ready
                      ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                      : "linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)",
                    color: ragServerStatus?.rag_ready ? "#166534" : "#991b1b",
                    border: ragServerStatus?.rag_ready
                      ? "2px solid #86efac"
                      : "2px solid #f87171",
                    borderRadius: "12px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                >
                  💾 {getRagStatusText()}
                </button>

                <button
                  onClick={() => setShowRulesPanel(!showRulesPanel)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: showRulesPanel
                      ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    color: showRulesPanel ? "white" : "#3b82f6",
                    border: showRulesPanel
                      ? "2px solid #60a5fa"
                      : "2px solid #3b82f6",
                    borderRadius: "12px",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    fontWeight: "600",
                  }}
                >
                  📖 내규 검색 {showRulesPanel ? " ▲" : " ▼"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 모바일에서 PWA 설치 버튼 */}
        {isMobile && showInstallButton && !isInstalled && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "8px",
              padding: "8px 12px",
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "8px",
            }}
          >
            <button
              onClick={handleInstall}
              className="install-button"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
              }}
              title="앱으로 설치하여 더 편리하게 사용하세요"
            >
              📲 앱 설치
            </button>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* 채팅 영역 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* 맨 아래로 스크롤 버튼 - 위치 수정 */}
          <button
            onClick={() => {
              setShouldAutoScroll(true);
              isUserScrollingRef.current = false; // 사용자 스크롤 상태 초기화
              // 더 강력한 스크롤 방법 사용
              if (messagesContainerRef.current) {
                const container = messagesContainerRef.current;
                const targetScrollTop =
                  container.scrollHeight - container.clientHeight;
                container.scrollTop = targetScrollTop;

                // 추가 보장
                setTimeout(() => {
                  container.scrollTop = container.scrollHeight;
                  if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({
                      behavior: "instant",
                      block: "end",
                    });
                  }
                }, 50);

                setTimeout(() => {
                  container.scrollTop = container.scrollHeight;
                }, 100);
              }
            }}
            style={{
              position: "absolute",
              bottom: isMobile ? `${inputAreaHeight + 20}px` : "160px",
              right: isMobile ? "16px" : "20px",
              width: isMobile ? "44px" : "48px",
              height: isMobile ? "44px" : "48px",
              borderRadius: isMobile ? "22px" : "24px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "white",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? "16px" : "18px",
              transition: "all 0.3s ease",
              zIndex: 5,
              opacity: shouldAutoScroll ? 0 : 1,
              transform: shouldAutoScroll ? "scale(0.8)" : "scale(1)",
              pointerEvents: shouldAutoScroll ? "none" : "auto",
            }}
            className="scroll-button-appear"
            title="맨 아래로 스크롤"
          >
            ⬇️
          </button>

          <div
            ref={messagesContainerRef}
            className={`messages-container ${
              isStreaming ? "streaming-mode" : ""
            }`}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: isMobile ? "12px" : "16px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "12px" : "16px",
              paddingBottom: isMobile ? "16px" : "16px",
              minHeight: 0,
              // 모바일에서 스크롤 가능하도록 높이 조정
              ...(isMobile && {
                height: `calc(100vh - 80px - ${inputAreaHeight}px - ${keyboardHeight}px)`,
                maxHeight: `calc(100vh - 80px - ${inputAreaHeight}px - ${keyboardHeight}px)`,
              }),
            }}
            onScroll={handleScroll}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "8px" : "12px",
                  ...(message.isBot ? {} : { justifyContent: "flex-end" }),
                }}
              >
                {message.isBot && (
                  <div
                    style={{
                      width: isMobile ? "28px" : "32px",
                      height: isMobile ? "28px" : "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: isMobile ? "12px" : "14px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                    }}
                  >
                    {message.isRAG ? (
                      <div style={{ position: "relative" }}>
                        🧠
                        <div
                          style={{
                            position: "absolute",
                            top: "-1px",
                            right: "-1px",
                            width: isMobile ? "4px" : "6px",
                            height: isMobile ? "4px" : "6px",
                            background: "#10b981",
                            borderRadius: "50%",
                            border: "1px solid white",
                          }}
                        />
                      </div>
                    ) : (
                      "🤖"
                    )}
                  </div>
                )}

                <div
                  style={{
                    maxWidth: isMobile ? "280px" : "420px",
                    padding: isMobile ? "10px 14px" : "12px 16px",
                    borderRadius: isMobile ? "14px" : "16px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    animation: "slideIn 0.3s ease-out",
                    overflowX: "auto",
                    wordBreak: "break-word",
                    ...(message.isBot
                      ? message.isRAG
                        ? {
                            backgroundColor: "#eff6ff",
                            color: "#1f2937",
                            border: "1px solid #bfdbfe",
                          }
                        : {
                            backgroundColor: "white",
                            color: "#1f2937",
                            border: "1px solid #e5e7eb",
                          }
                      : {
                          backgroundColor: "#3b82f6",
                          color: "white",
                          marginLeft: "auto",
                        }),
                  }}
                >
                  {/* 메시지 텍스트 파싱 및 표시 */}
                  {message.isBot ? (
                    (() => {
                      // 스트리밍 중이거나 thinkingContent가 있으면 별도 필드 사용
                      let thinkingContent = message.thinkingContent;
                      let displayContent = message.text;

                      // 디버깅을 위한 로그 (실제 사용시 제거 가능)
                      if (message.id && message.isBot) {
                        console.log(
                          `메시지 ${message.id}: isStreaming=${
                            message.isStreaming
                          }, thinkingContent 길이=${
                            thinkingContent?.length || 0
                          }`
                        );
                      }

                      // 스트리밍이 완료되었고 thinkingContent가 없거나 비어있는 경우에만 텍스트에서 파싱
                      if (
                        !message.isStreaming &&
                        (!thinkingContent || thinkingContent.trim() === "")
                      ) {
                        const parsed = parseMessageWithThinking(message.text);
                        thinkingContent = parsed.thinkingContent;
                        displayContent = parsed.parts
                          .map((part) => part.content)
                          .join("");
                        console.log(
                          `파싱 완료: thinkingContent=${thinkingContent?.substring(
                            0,
                            50
                          )}...`
                        );
                      }

                      return (
                        <>
                          {/* 사고 과정 표시 */}
                          {thinkingContent && thinkingContent.trim() !== "" && (
                            <div
                              style={{
                                fontSize: isMobile ? "11px" : "12px",
                                color: "#6b7280",
                                backgroundColor: "#f8fafc",
                                padding: isMobile ? "8px" : "12px",
                                borderRadius: isMobile ? "6px" : "8px",
                                marginBottom: isMobile ? "8px" : "12px",
                                border: "1px solid #e2e8f0",
                                borderLeft: "4px solid #94a3b8",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                width: isMobile ? "280px" : "420px",
                                boxSizing: "border-box",
                              }}
                            >
                              <div
                                className="thinking-header"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  padding: "4px 6px",
                                  borderRadius: "4px",
                                  transition: "background-color 0.2s ease",
                                  width: "100%",
                                  boxSizing: "border-box",
                                }}
                                onClick={() => toggleThinking(message.id)}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flex: 1,
                                    minWidth: 0, // flex 아이템이 shrink 될 수 있도록
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      backgroundColor:
                                        message.isStreaming &&
                                        !thinkingContent?.includes("</think>")
                                          ? "#f59e0b"
                                          : "#3b82f6",
                                      borderRadius: "50%",
                                      animation:
                                        message.isStreaming &&
                                        !thinkingContent?.includes("</think>")
                                          ? "fastPulse 1s infinite"
                                          : "pulse 2s infinite",
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div
                                    style={{
                                      fontSize: isMobile ? "11px" : "13px",
                                      fontWeight: "600",
                                      color: "#64748b",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      flex: 1,
                                    }}
                                  >
                                    🤔{" "}
                                    {generateThinkingSummary(
                                      thinkingContent,
                                      message.isStreaming
                                    )}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    color: "#6b7280",
                                    transition: "transform 0.2s ease",
                                    fontSize: isMobile ? "14px" : "16px",
                                    transform: expandedThinking[message.id]
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                    flexShrink: 0,
                                    marginLeft: "8px",
                                  }}
                                >
                                  ▼
                                </div>
                              </div>

                              {expandedThinking[message.id] && (
                                <div
                                  className="thinking-content"
                                  style={{
                                    marginTop: isMobile ? "8px" : "12px",
                                    paddingTop: isMobile ? "8px" : "12px",
                                    borderTop: "1px solid #e2e8f0",
                                    width: "100%",
                                    boxSizing: "border-box",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: isMobile ? "10px" : "11px",
                                      color: "#475569",
                                      lineHeight: "1.5",
                                      whiteSpace: "pre-wrap",
                                      backgroundColor: "#ffffff",
                                      padding: isMobile ? "8px" : "10px",
                                      borderRadius: "6px",
                                      border: "1px solid #e2e8f0",
                                      marginTop: "4px",
                                      fontFamily: "Monaco, Menlo, monospace",
                                      fontStyle: "italic",
                                      width: "100%",
                                      boxSizing: "border-box",
                                      wordBreak: "break-word",
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    {thinkingContent
                                      ? thinkingContent
                                          .replace(/<\/?think>/g, "")
                                          .trim()
                                      : "사고 과정을 불러오는 중..."}
                                    {/* 스트리밍 중일 때 커서 애니메이션 */}
                                    {message.isStreaming &&
                                      !thinkingContent?.includes(
                                        "</think>"
                                      ) && (
                                        <span
                                          style={{
                                            animation: "blink 1s infinite",
                                            color: "#f59e0b",
                                            fontWeight: "bold",
                                            fontSize: isMobile
                                              ? "12px"
                                              : "14px",
                                            marginLeft: "2px",
                                          }}
                                        >
                                          |
                                        </span>
                                      )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ReactMarkdown으로 렌더링된 텍스트 표시 */}
                          <div
                            style={{
                              fontSize: isMobile ? "13px" : "14px",
                              lineHeight: "1.5",
                              margin: "0",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={MarkdownComponents}
                            >
                              {displayContent}
                            </ReactMarkdown>
                            {/* 스트리밍 중일 때 커서 애니메이션 */}
                            {message.isStreaming && (
                              <span
                                style={{
                                  animation: "blink 1s infinite",
                                  color: "#3b82f6",
                                  fontWeight: "bold",
                                  fontSize: isMobile ? "14px" : "16px",
                                  marginLeft: "2px",
                                }}
                              >
                                |
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p
                      style={{
                        fontSize: isMobile ? "13px" : "14px",
                        lineHeight: "1.5",
                        margin: "0",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {message.text}
                    </p>
                  )}

                  {/* RAG 컨텍스트 표시 */}
                  {message.context && message.context.length > 0 && (
                    <div
                      style={{
                        fontSize: isMobile ? "11px" : "12px",
                        color: "#7c2d12",
                        backgroundColor: "#fef3c7",
                        padding: isMobile ? "6px" : "8px",
                        borderRadius: "6px",
                        marginTop: isMobile ? "6px" : "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: isMobile ? "6px" : "8px",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                        onClick={() => toggleContext(message.id)}
                      >
                        <div
                          style={{
                            fontSize: isMobile ? "11px" : "12px",
                            fontWeight: "600",
                            color: "#7c2d12",
                          }}
                        >
                          📖 참고한 회사 내규 ({message.context.length}개)
                        </div>
                        <div
                          style={{
                            color: "#7c2d12",
                            transition: "transform 0.2s ease",
                            fontSize: isMobile ? "14px" : "16px",
                            transform: expandedContexts[message.id]
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                        >
                          ▼
                        </div>
                      </div>

                      {expandedContexts[message.id] ? (
                        <div
                          style={{
                            fontSize: isMobile ? "10px" : "11px",
                            color: "#a16207",
                          }}
                        >
                          {message.context.map((ctx, contextIndex) => (
                            <div
                              key={contextIndex}
                              style={{
                                marginTop: "4px",
                                padding: "4px 0",
                                borderBottom: "1px solid #fed7aa",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: "600",
                                  marginBottom: "2px",
                                }}
                              >
                                {contextIndex + 1}. {ctx.question}
                              </div>
                              <div
                                style={{
                                  color: "#a16207",
                                  fontSize: isMobile ? "9px" : "10px",
                                  marginBottom: "2px",
                                }}
                              >
                                {getCategoryEmoji(ctx.main_category)}{" "}
                                {getCategoryName(ctx.main_category)} >{" "}
                                {ctx.sub_category} | 관련도:{" "}
                                {(ctx.score * 100).toFixed(1)}%
                              </div>
                              <div
                                style={{ color: "#7c2d12", lineHeight: "1.3" }}
                              >
                                {ctx.answer}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: isMobile ? "10px" : "11px",
                            color: "#a16207",
                          }}
                        >
                          {message.context
                            .slice(0, 2)
                            .map((ctx, contextIndex) => (
                              <div
                                key={contextIndex}
                                style={{
                                  marginTop: "4px",
                                  fontSize: isMobile ? "10px" : "11px",
                                }}
                              >
                                • {getCategoryEmoji(ctx.main_category)}{" "}
                                {ctx.question} (관련도:{" "}
                                {(ctx.score * 100).toFixed(1)}%)
                              </div>
                            ))}
                          {message.context.length > 2 && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: isMobile ? "9px" : "10px",
                                color: "#6b7280",
                              }}
                            >
                              ... 및 {message.context.length - 2}개 추가 내규
                              (클릭하여 모두 보기)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: isMobile ? "10px" : "12px",
                      margin: 0,
                      marginTop: isMobile ? "6px" : "8px",
                      ...(message.isBot
                        ? { color: "#6b7280" }
                        : { color: "#bfdbfe" }),
                    }}
                  >
                    {formatTime(message.timestamp)}
                    {message.isRule && " 📖 내규"}
                    {message.isRAG && " 🔍 RAG"}
                    {message.isStreaming && " ⚡ 스트리밍"}
                    {!message.isStreaming &&
                      message.isBot &&
                      getProcessingTime(message) &&
                      ` ⏱️ ${getProcessingTime(message)}초`}
                    {selectedMainCategory &&
                      ` 📂 ${getCategoryName(selectedMainCategory)}`}
                  </p>
                </div>

                {!message.isBot && (
                  <div
                    style={{
                      width: isMobile ? "28px" : "32px",
                      height: isMobile ? "28px" : "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: isMobile ? "12px" : "14px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      background:
                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      color: "white",
                    }}
                  >
                    👨‍💼
                  </div>
                )}
              </div>
            ))}

            {/* 타이핑 인디케이터 */}
            {isTyping && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "8px" : "12px",
                }}
              >
                <div
                  style={{
                    width: isMobile ? "28px" : "32px",
                    height: isMobile ? "28px" : "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: isMobile ? "12px" : "14px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    🤔
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        right: "0",
                        width: "4px",
                        height: "4px",
                        background: "#fbbf24",
                        borderRadius: "50%",
                        animation: "blink 1s infinite",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    padding: isMobile ? "10px 14px" : "12px 16px",
                    borderRadius: isMobile ? "14px" : "16px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ display: "flex", gap: "4px" }}>
                    <div
                      style={{
                        width: isMobile ? "6px" : "8px",
                        height: isMobile ? "6px" : "8px",
                        backgroundColor: "#9ca3af",
                        borderRadius: "50%",
                        animation: "bounce 1.4s ease-in-out infinite both",
                      }}
                      className="dot"
                    ></div>
                    <div
                      style={{
                        width: isMobile ? "6px" : "8px",
                        height: isMobile ? "6px" : "8px",
                        backgroundColor: "#9ca3af",
                        borderRadius: "50%",
                        animation: "bounce 1.4s ease-in-out infinite both",
                      }}
                      className="dot"
                    ></div>
                    <div
                      style={{
                        width: isMobile ? "6px" : "8px",
                        height: isMobile ? "6px" : "8px",
                        backgroundColor: "#9ca3af",
                        borderRadius: "50%",
                        animation: "bounce 1.4s ease-in-out infinite both",
                      }}
                      className="dot"
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
              style={{
                height: "1px",
                width: "100%",
                marginTop: isMobile ? "20px" : "16px",
              }}
            />
          </div>

          {/* 입력 영역 - 모바일에서 fixed 위치 개선 */}
          <div
            style={{
              backgroundColor: "white",
              borderTop: "1px solid #e5e7eb",
              padding: isMobile ? "12px" : "16px",
              position: isMobile ? "fixed" : "relative",
              bottom: isMobile ? keyboardHeight : "auto",
              left: isMobile ? 0 : "auto",
              right: isMobile ? 0 : "auto",
              zIndex: isMobile ? 100 : "auto",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: isMobile ? "8px" : "12px",
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={`회사 ${
                    selectedMainCategory
                      ? getCategoryName(selectedMainCategory) + " "
                      : ""
                  }내규에 대해 무엇이든 물어보세요...`}
                  style={{
                    width: "100%",
                    padding: isMobile ? "10px 14px" : "12px 16px",
                    border: `1px solid ${isFocused ? "#3b82f6" : "#d1d5db"}`,
                    borderRadius: isMobile ? "14px" : "16px",
                    outline: "none",
                    resize: "none",
                    minHeight: isMobile ? "44px" : "48px",
                    maxHeight: isMobile ? "100px" : "120px",
                    fontFamily: "inherit",
                    fontSize: isMobile ? "13px" : "14px",
                    transition: "all 0.2s ease",
                    boxShadow: isFocused
                      ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                      : "none",
                  }}
                  rows={1}
                  disabled={isTyping || isStreaming}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || isTyping || isStreaming}
                style={{
                  background:
                    !inputText.trim() || isTyping || isStreaming
                      ? "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)"
                      : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  color: "white",
                  padding: isMobile ? "10px" : "12px",
                  borderRadius: isMobile ? "14px" : "16px",
                  border: "none",
                  cursor:
                    !inputText.trim() || isTyping || isStreaming
                      ? "not-allowed"
                      : "pointer",
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isMobile ? "14px" : "16px",
                  minWidth: isMobile ? "44px" : "48px",
                  minHeight: isMobile ? "44px" : "48px",
                  zIndex: 10,
                  position: "relative",
                }}
              >
                {isTyping || isStreaming ? (
                  <div
                    style={{
                      animation: "spin 1s linear infinite",
                      fontSize: isMobile ? "16px" : "18px",
                    }}
                  >
                    🔄
                  </div>
                ) : (
                  <div style={{ fontSize: isMobile ? "16px" : "18px" }}>🚀</div>
                )}
              </button>
            </div>
            <p
              style={{
                fontSize: isMobile ? "10px" : "12px",
                color: "#6b7280",
                marginTop: isMobile ? "6px" : "8px",
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {isMobile ? (
                <>
                  Enter로 전송, Shift+Enter로 줄바꿈
                  {selectedMainCategory &&
                    ` • 📂 ${getCategoryName(selectedMainCategory)}`}
                  {ragServerStatus?.rag_ready && " • ✅ RAG 연결"}
                  {isStreaming && " • ⚡ 수신중"}
                </>
              ) : (
                <>
                  Enter로 전송, Shift+Enter로 줄바꿈 • 🧠 ChromaDB RAG + 🤖 LLM
                  실시간 스트리밍 • 💬 연속 대화 지원
                  {selectedMainCategory &&
                    ` • 📂 ${getCategoryName(selectedMainCategory)} 필터링`}
                  {ragServerStatus?.rag_ready && " • ✅ RAG 서버 연결됨"}
                  {/* {isStreaming && " • ⚡ 실시간 응답 수신 중..."} */}
                </>
              )}
            </p>
          </div>
        </div>

        {/* 회사 내규 패널 */}
        <div
          className={isMobile ? "mobile-panel" : ""}
          style={{
            width: isMobile
              ? showRulesPanel
                ? "100%"
                : "0"
              : showRulesPanel
              ? "380px"
              : "0",
            backgroundColor: "white",
            borderLeft: isMobile ? "none" : "1px solid #e5e7eb",
            transition: isMobile ? "none" : "width 0.3s ease",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: isMobile ? "fixed" : "relative",
            top: isMobile ? 0 : "auto",
            left: isMobile ? 0 : "auto",
            right: isMobile ? 0 : "auto",
            bottom: isMobile ? 0 : "auto",
            zIndex: isMobile ? 1000 : "auto",
            minHeight: 0,
          }}
        >
          {showRulesPanel && (
            <>
              <div
                style={{
                  padding: isMobile ? "16px" : "16px",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f8fafc",
                  flexShrink: 0,
                }}
              >
                {/* 모바일에서 닫기 버튼 */}
                {isMobile && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        color: "#1f2937",
                        fontWeight: "bold",
                      }}
                    >
                      🔍 내규 검색
                    </h3>
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        setShowRulesPanel(false);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "24px",
                        cursor: "pointer",
                        color: "#6b7280",
                        padding: "4px",
                        borderRadius: "4px",
                      }}
                    >
                      ✖️
                    </button>
                  </div>
                )}

                {!isMobile && (
                  <h3
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "16px",
                      color: "#1f2937",
                    }}
                  >
                    🔍 회사 내규 검색
                  </h3>
                )}

                {/* 모바일 카테고리 필터 */}
                {isMobile && (
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{ position: "relative" }}
                      className="category-filter"
                    >
                      <button
                        onClick={() =>
                          setShowCategoryFilter(!showCategoryFilter)
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          gap: "8px",
                          padding: "12px 16px",
                          background: selectedMainCategory
                            ? "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)"
                            : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                          color: selectedMainCategory ? "#1e40af" : "#374151",
                          border: selectedMainCategory
                            ? "2px solid #93c5fd"
                            : "1px solid #d1d5db",
                          borderRadius: "12px",
                          fontSize: "14px",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <span>
                          {selectedMainCategory ? (
                            <>
                              {getCategoryEmoji(selectedMainCategory)}{" "}
                              {getCategoryName(selectedMainCategory)}
                            </>
                          ) : (
                            <>📂 전체 내규</>
                          )}
                        </span>
                        <span>{showCategoryFilter ? "▲" : "▼"}</span>
                      </button>

                      {showCategoryFilter && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: "0",
                            right: "0",
                            marginTop: "4px",
                            backgroundColor: "white",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 30,
                            maxHeight: "200px",
                            overflowY: "auto",
                          }}
                        >
                          <div
                            style={{
                              padding: "12px 16px",
                              cursor: "pointer",
                              fontSize: "14px",
                              borderBottom: "1px solid #f3f4f6",
                              transition: "backgroundColor 0.2s ease",
                              backgroundColor: !selectedMainCategory
                                ? "#f3f4f6"
                                : "white",
                            }}
                            onClick={() => handleCategorySelect("")}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span>📂</span>
                              <span>전체 내규</span>
                              <span
                                style={{ fontSize: "12px", color: "#6b7280" }}
                              >
                                ({categories.total_regulations || 0}개)
                              </span>
                            </div>
                          </div>

                          {categories.main_categories &&
                            Object.entries(categories.main_categories).map(
                              ([categoryKey, categoryInfo]) => (
                                <div
                                  key={categoryKey}
                                  style={{
                                    padding: "12px 16px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    borderBottom: "1px solid #f3f4f6",
                                    transition: "backgroundColor 0.2s ease",
                                    backgroundColor:
                                      selectedMainCategory === categoryKey
                                        ? "#f3f4f6"
                                        : "white",
                                  }}
                                  onClick={() =>
                                    handleCategorySelect(categoryKey)
                                  }
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    <span>{getCategoryEmoji(categoryKey)}</span>
                                    <span>{getCategoryName(categoryKey)}</span>
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                      }}
                                    >
                                      ({categoryInfo.total_faqs}개)
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#9ca3af",
                                    }}
                                  >
                                    {categoryInfo.sub_categories}개 소구분
                                  </div>
                                </div>
                              )
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 모바일 RAG 서버 상태 */}
                {isMobile && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                      padding: "8px 12px",
                      background: ragServerStatus?.rag_ready
                        ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                        : "linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)",
                      color: ragServerStatus?.rag_ready ? "#166534" : "#991b1b",
                      border: ragServerStatus?.rag_ready
                        ? "2px solid #86efac"
                        : "2px solid #f87171",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    <span>💾</span>
                    <span>{getRagStatusText()}</span>
                    <button
                      onClick={testRagServer}
                      disabled={isTyping}
                      style={{
                        marginLeft: "auto",
                        padding: "4px 8px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        border: "1px solid currentColor",
                        background: "transparent",
                        color: "inherit",
                        cursor: isTyping ? "not-allowed" : "pointer",
                        opacity: isTyping ? 0.5 : 1,
                      }}
                    >
                      🎯 테스트
                    </button>
                  </div>
                )}

                {selectedMainCategory && (
                  <div
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#dbeafe",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#1e40af",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {getCategoryEmoji(selectedMainCategory)}{" "}
                    {getCategoryName(selectedMainCategory)} 필터링 중
                  </div>
                )}
                <input
                  ref={rulesSearchInputRef}
                  type="text"
                  placeholder="회사 내규 검색... (2글자 이상 입력)"
                  value={rulesSearchTerm}
                  onChange={handleRulesSearchChange}
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 16px" : "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: isMobile ? "8px" : "6px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                  disabled={isSearching}
                  autoFocus={!isMobile}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: isMobile ? "12px" : "8px",
                  minHeight: 0,
                }}
              >
                {rulesSearchResults.length > 0 ? (
                  rulesSearchResults.map((regulation, resultIndex) => (
                    <div
                      key={resultIndex}
                      style={{
                        padding: isMobile ? "16px" : "12px",
                        margin: "4px 0",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: isMobile ? "12px" : "8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => applyRegulationToChat(regulation)}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          marginBottom: isMobile ? "10px" : "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: isMobile ? "11px" : "10px",
                            color: "#3730a3",
                            backgroundColor: "#e0e7ff",
                            padding: isMobile ? "4px 8px" : "2px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                            marginBottom: "4px",
                            marginRight: "4px",
                          }}
                        >
                          {getCategoryEmoji(regulation.main_category)}{" "}
                          {getCategoryName(regulation.main_category)}
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? "11px" : "10px",
                            backgroundColor:
                              regulation.score >= 0.7
                                ? "#dcfce7"
                                : regulation.score >= 0.4
                                ? "#fef3c7"
                                : "#fef2f2",
                            color:
                              regulation.score >= 0.7
                                ? "#059669"
                                : regulation.score >= 0.4
                                ? "#d97706"
                                : "#dc2626",
                            padding: isMobile ? "4px 8px" : "2px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                            marginLeft: "4px",
                            fontWeight: "600",
                          }}
                        >
                          {(regulation.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? "14px" : "13px",
                          fontWeight: "600",
                          color: "#1f2937",
                          marginBottom: isMobile ? "6px" : "4px",
                          lineHeight: "1.4",
                        }}
                      >
                        {regulation.question}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? "13px" : "12px",
                          color: "#6b7280",
                          lineHeight: "1.4",
                          display: "-webkit-box",
                          WebkitLineClamp: isMobile ? 4 : 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {regulation.answer}
                      </div>
                    </div>
                  ))
                ) : rulesSearchTerm ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                      padding: isMobile ? "40px 20px" : "32px 16px",
                      fontSize: isMobile ? "15px" : "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    {isSearching
                      ? "벡터 검색 중..."
                      : `"${rulesSearchTerm}"에 대한 ${
                          selectedMainCategory
                            ? getCategoryName(selectedMainCategory) + " "
                            : ""
                        }내규를 찾을 수 없습니다.`}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                      padding: isMobile ? "40px 20px" : "32px 16px",
                      fontSize: isMobile ? "15px" : "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    🧠 벡터 유사도 검색으로
                    <br />
                    정확한 회사 내규를 찾아보세요!
                    <div
                      style={{
                        marginTop: "16px",
                        fontSize: isMobile ? "13px" : "12px",
                      }}
                    >
                      예시: "휴가", "출장", "급여", "계약", "구매"
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
