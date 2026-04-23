importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBto16XfwgU2DW4f0M7wvjdZZKfy1_wY",
    authDomain: "voxiapp-6672e.firebaseapp.com",
    projectId: "voxiapp-6672e",
    storageBucket: "voxiapp-6672e.firebasestorage.app",
    messagingSenderId: "332968241548",
    appId: "1:332968241548:web:7f35ebe2cd2443fb0732",
    measurementId: "G-77F6483313"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Recibido mensaje en segundo plano ', payload);
    const notificationTitle = payload.notification ? payload.notification.title : "ALERTA DE SEGUIMIENTO";
    const notificationOptions = {
        body: payload.notification ? payload.notification.body : payload.data.message,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'voxi-push-real',
        requireInteraction: true,
        data: {
            url: self.registration.scope
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
