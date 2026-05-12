const VERSION = '1.1.6'; // تحديث الإصدار لضمان التزامن
let swReminders = [];
let pharmacyNumber = null;
let offerImages = {};

const SUPABASE_URL = 'https://uzydzvfcrlqmtondugte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6eWR6dmZjcmxxbXRvbmR1Z3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTA1MzMsImV4cCI6MjA5MjM2NjUzM30.z7-eKWrYjW9cbzTcoyyKprgXbcqCHk_kF6ETHokudzo';

self.addEventListener('install', (event) => {
    console.log('SW Installing v', VERSION);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

async function fetchRemindersFromSW() {
    if (!pharmacyNumber) return;
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/reminders?pharmacy_number=eq.${pharmacyNumber}&status=in.(pending,snoozed)`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (response.ok) {
            swReminders = await response.json();
            console.log('SW fetched reminders:', swReminders.length);
        }
    } catch (err) {
        console.error('SW fetch error:', err);
    }
}

self.addEventListener('message', (event) => {
    if (event.data) {
        if (event.data.type === 'UPDATE_REMINDERS') {
            swReminders = event.data.reminders;
            pharmacyNumber = event.data.pharmacy_number;
            if (event.data.offer_images) {
                offerImages = event.data.offer_images;
            }
            console.log('SW Reminders updated:', swReminders.length);
        }
        if (event.data.type === 'SHOW_NOTIFICATION') {
            self.registration.showNotification(event.data.title, {
                body: event.data.body,
                icon: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png',
                image: event.data.image || null, // دعم الصورة الكبيرة
                vibrate: [200, 100, 200],
                badge: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png'
            });
        }
    }
});

// محاولة البقاء حياً والتحقق من التنبيهات
setInterval(() => {
    const now = Date.now();
    
    if (swReminders.length === 0 && pharmacyNumber) {
        fetchRemindersFromSW();
    }

    swReminders.forEach(rem => {
        const trigTime = new Date(rem.trigger_time).getTime();
        const diff = now - trigTime;

        // التحقق مما إذا كان الوقت قد حان (نافذة دقيقة واحدة بدلاً من دقيقتين لزيادة الدقة)
        if (now >= trigTime && diff < 60000) {
            console.log(`[SW] Triggering notification for: ${rem.offer_title}. Diff: ${diff}ms`);
            
            const isExact = rem.offer_id.includes('_exact');
            const message = isExact 
                ? rem.offer_title + " بدأ الآن! 🔥" 
                : rem.offer_title + " سيبدأ خلال 30 دقيقة! ⏳";
            
            const baseOfferId = rem.offer_id.replace('_30min', '').replace('_exact', '');
            const imageUrl = offerImages[baseOfferId] || null;

            // إظهار الإشعار في كل الأحوال (حتى لو الموقع مفتوح)
            self.registration.showNotification("تنبيه MONO SYSTEM", {
                body: message,
                icon: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png',
                image: imageUrl,
                vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
                badge: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png',
                tag: rem.id,
                data: { url: self.location.origin + '/index.htm' },
                requireInteraction: true
            });
            
            // إزالة التنبيه من القائمة المحلية لمنع التكرار
            swReminders = swReminders.filter(r => r.id !== rem.id);
        }
    });
}, 10000);

// التعامل مع الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) { client = clientList[i]; }
                }
                return client.focus();
            }
            return clients.openWindow(event.notification.data.url);
        })
    );
});
