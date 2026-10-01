const CACHE_NAME = "book-budget-calculator-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// インストール時に最低限のファイルを保存
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );

  // 新しいService Workerをすぐ待機状態から進める
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  // 開いているページをすぐ制御
  self.clients.claim();
});

// オンライン優先
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {

        // 正常に取得できたら最新版をキャッシュ
        if (response && response.status === 200) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, copy);
            });
        }

        return response;
      })
      .catch(() => {

        // 通信失敗時だけキャッシュを使う
        return caches.match(event.request)
          .then(cached => {

            if (cached) {
              return cached;
            }

            // ページなら最後の砦としてindex.html
            if (event.request.mode === "navigate") {
              return caches.match("./index.html");
            }

            return Response.error();
          });
      })
  );
});