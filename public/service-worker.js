// public/service-worker.js
const CACHE_NAME = "chatbot-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/manifest.json",
  "/favicon.ico",
];

// 설치 이벤트 - 리소스 캐싱
self.addEventListener("install", (event) => {
  console.log("Service Worker: Install");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching App Shell");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Service Worker: Cache failed", error);
      })
  );
});

// 활성화 이벤트 - 오래된 캐시 정리
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 네트워크 요청 가로채기 - 캐시 우선 전략
self.addEventListener("fetch", (event) => {
  // API 요청은 항상 네트워크 우선
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // API 요청 실패 시 오프라인 메시지
        return new Response(
          JSON.stringify({
            error: "오프라인 상태입니다. 인터넷 연결을 확인해주세요.",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 503,
          }
        );
      })
    );
    return;
  }

  // 정적 리소스는 캐시 우선
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시 응답, 없으면 네트워크 요청
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // 유효한 응답이 아니면 그대로 반환
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // 응답을 복사해서 캐시에 저장
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // 오프라인이고 캐시에도 없는 경우
        if (event.request.destination === "document") {
          return caches.match("/");
        }
      })
  );
});

// 백그라운드 동기화 (선택사항)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Service Worker: Background sync");
    // 오프라인에서 저장된 데이터 동기화 로직
  }
});

// 푸시 알림 (선택사항)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push event");

  const options = {
    body: event.data ? event.data.text() : "새로운 메시지가 있습니다",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification("더케이교직원나라", options)
  );
});
