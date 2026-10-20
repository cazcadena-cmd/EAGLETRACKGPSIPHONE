/* Service Worker - Eagle Track GPS (PWA)
   Repo: https://cazcadena-cmd.github.io/EAGLETRACKGPSIPHONE/
   Solo gestiona recursos del propio origen. La API del GPS, los mapas
   y las librerías externas siempre van directo a la red. */

const VERSION_CACHE = 'eagle-track-gps-v1';
const ARCHIVOS_BASE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(VERSION_CACHE).then(cache =>
            Promise.all(ARCHIVOS_BASE.map(archivo => cache.add(archivo).catch(() => null)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(claves => Promise.all(claves.filter(clave => clave !== VERSION_CACHE).map(clave => caches.delete(clave))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const peticion = event.request;
    if (peticion.method !== 'GET') return;

    const url = new URL(peticion.url);
    if (url.origin !== self.location.origin) return;

    // Navegación: red primero, caché como respaldo sin conexión
    if (peticion.mode === 'navigate') {
        event.respondWith(
            fetch(peticion)
                .then(respuesta => {
                    const copia = respuesta.clone();
                    caches.open(VERSION_CACHE).then(cache => cache.put('./index.html', copia)).catch(() => {});
                    return respuesta;
                })
                .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
        );
        return;
    }

    // Recursos estáticos del mismo origen: caché y actualización en segundo plano
    event.respondWith(
        caches.match(peticion).then(enCache => {
            const desdeRed = fetch(peticion)
                .then(respuesta => {
                    if (respuesta && respuesta.status === 200) {
                        const copia = respuesta.clone();
                        caches.open(VERSION_CACHE).then(cache => cache.put(peticion, copia)).catch(() => {});
                    }
                    return respuesta;
                })
                .catch(() => enCache);
            return enCache || desdeRed;
        })
    );
});
