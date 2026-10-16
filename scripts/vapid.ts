import webpush from "web-push";

const k = webpush.generateVAPIDKeys();
console.log("Agrega estas variables a .env.local y a Vercel:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${k.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${k.privateKey}`);
console.log("VAPID_SUBJECT=mailto:tu-correo@ejemplo.com");
