let swReminders = [];
let pharmacyNumber = null;
const SUPABASE_URL = 'https://uzydzvfcrlqmtondugte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6eWR6dmZjcmxxbXRvbmR1Z3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTA1MzMsImV4cCI6MjA5MjM2NjUzM30.z7-eKWrYjW9cbzTcoyyKprgXbcqCHk_kF6ETHokudzo';

self.addEventListener('install', (event) => {
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
            console.log('SW Reminders updated:', swReminders.length);
        }
        if (event.data.type === 'SHOW_NOTIFICATION') {
            self.registration.showNotification(event.data.title, {
                body: event.data.body,
                icon: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png',
                vibrate: [200, 100, 200],
                badge: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png'
            });
        }
    }
});

// محاولة البقاء حياً والتحقق من التنبيهات
setInterval(() => {
    if (swReminders.length === 0 && pharmacyNumber) {
        fetchRemindersFromSW();
    }

    const now = Date.now();
    swReminders.forEach(rem => {
        const trigTime = new Date(rem.trigger_time).getTime();
        // التحقق مما إذا كان الوقت قد حان (خلال نافذة دقيقتين)
        if (now >= trigTime && (now - trigTime) < 120000) {
            const isExact = rem.offer_id.includes('_exact');
            const message = isExact 
                ? rem.offer_title + " بدأ الآن! 🔥" 
                : rem.offer_title + " سيبدأ خلال 30 دقيقة! ⏳";
            
            self.registration.showNotification("تنبيه MONO SYSTEM", {
                body: message,
                icon: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png',
                vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
                badge: 'https://raw.githubusercontent.com/meralmohamed12/1022-cyberDrug-Monograph/858ba78ce2719a0e7069fd4807b725e0002a17d86/20251129_184528_0005.png',
                tag: rem.id,
                requireInteraction: true // يجعل الإشعار لا يختفي حتى يتفاعل معه المستخدم
            });
            
            // إزالة التنبيه من القائمة المحلية لمنع التكرار
            swReminders = swReminders.filter(r => r.id !== rem.id);
        }
    });
}, 10000);
