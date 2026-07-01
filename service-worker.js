// ============================================
// SERVICE WORKER - OT PREVENTIF
// Version 1.0
// ============================================

const CACHE_NAME = 'ot-preventif-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  // Librairies externes (CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js'
];

// ============================================
// INSTALLATION : Mise en cache des ressources
// ============================================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des fichiers');
        return cache.addAll(CACHE_URLS).catch((err) => {
          console.warn('[Service Worker] Certains fichiers n\'ont pas pu être mis en cache:', err);
        });
      })
      .then(() => {
        console.log('[Service Worker] Installation terminée');
        return self.skipWaiting();
      })
  );
});

// ============================================
// ACTIVATION : Nettoyage des anciens caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation en cours...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation terminée');
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH : Interception des requêtes réseau
// Stratégie : Cache First, puis Network
// ============================================
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les extensions Chrome
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si trouvé en cache, on renvoie la version cachée
        if (cachedResponse) {
          // En parallèle, on tente de mettre à jour le cache en arrière-plan
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {
            // Ignore les erreurs réseau silencieusement
          });
          return cachedResponse;
        }
        
        // Sinon, on va chercher sur le réseau
        return fetch(event.request).then((networkResponse) => {
          // Si la réponse est valide, on la met en cache
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // En cas d'échec réseau, retourner la page d'accueil depuis le cache
          return caches.match('./index.html');
        });
      })
  );
});

// ============================================
// MESSAGE : Communication avec la page
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Chargé - Version:', CACHE_NAME);
