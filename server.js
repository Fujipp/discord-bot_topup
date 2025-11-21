// server.js
// จุดเริ่มรันแอปสำหรับ PaaS (Azure/Render/Railway ฯลฯ)
// - ต้อง listen(process.env.PORT) และ bind 0.0.0.0
// - มี health endpoint เพื่อลดอาการ "Starting the site..." ค้าง

const express = require('express');
const os = require('os');

const app = express();

// เผื่อ reverse proxy ข้างหน้า (บาง PaaS ใช้)
app.set('trust proxy', true);

// Health endpoints (ใช้ได้กับทั้ง probe และ manual check)
app.get('/', (_req, res) => res.status(200).send('OK ✅'));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'healthy' }));
app.get('/readyz', (_req, res) =>
  res.status(200).json({
    status: 'ready',
    uptime: process.uptime(),
    pid: process.pid,
    hostname: os.hostname(),
    time: new Date().toISOString(),
  })
);

// สำคัญ: ต้องรับพอร์ตจากโฮสต์ และ bind 0.0.0.0
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🌐 HTTP server listening on ${HOST}:${PORT}`);
  // สตาร์ทบอทหลัง HTTP พร้อม (กันแครชตอนพอร์ตยังไม่พร้อม)
  // แก้ path ให้ตรง ถ้าไฟล์บอทไม่ใช่ index.js
  try {
    require('./index.js');
  } catch (err) {
    console.error('❌ Failed to start Discord bot:', err);
    // ไม่ exit เพื่อให้ health ยังตอบ (ให้ดู log/แก้ env ก่อน)
  }
});

// ปิดโปรเซสอย่างสุภาพเมื่อได้รับสัญญาณจากโฮสต์
const graceful = (signal) => {
  console.log(`⚠️ Received ${signal}, shutting down HTTP server...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });
  // กันค้าง
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.once('SIGINT', () => graceful('SIGINT'));
process.once('SIGTERM', () => graceful('SIGTERM'));

// กันโปรเซสดับเพราะ promise ไม่ถูกจับ
process.on('unhandledRejection', (err) => {
  console.error('🚨 UnhandledRejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('🚨 UncaughtException:', err);
});
