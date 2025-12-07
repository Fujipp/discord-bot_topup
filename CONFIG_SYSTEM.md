# 🔧 Config System Guide

## ภาพรวม
บอทมีระบบ Config แบบ centralized ที่รองรับ:
- ✅ Environment Variables (.env)
- ✅ Config File (update/logdata.json)
- ✅ Discord GUI (/setup command)
- ✅ Realtime updates & validation

## โครงสร้าง

### Core Files
```
utils/
  ├── configManager.js      # Logic สำหรับอ่าน/เขียน config
  └── configEmbed.js        # Embeds สำหรับแสดงผล UI

commands/
  └── setup.js              # Slash command /setup

interactions/
  └── configInteractions.js # Button/Modal handlers สำหรับ config
```

## การใช้งาน

### 1. ตั้งค่าผ่าน Environment Variables (.env)

```env
# ตัวอย่าง
DISCORD_TOKEN=your_token
API_SLIPOK_KEY=SLIPOK...
SLIPOK_BRANCH_ID=12345
API_TRUEMONEY_KEY_ID=ak_live_...
TRUEMONEY_PHONE=0612345678
```

**ข้อดี:**
- ปลอดภัยที่สุด (ไม่ commit ไป git)
- ใช้ได้บน PaaS ทันที
- Override config file ได้

### 2. ตั้งค่าผ่าน Discord UI (/setup)

```
/setup
├── 🏦 ตั้งค่า SlipOK
│   ├── Branch ID
│   ├── API Key
│   ├── Phone (PromptPay)
│   └── Min Amount
├── 🧧 ตั้งค่า TrueMoney
│   ├── Phone
│   ├── API Key
│   └── Base URL
├── 🆔 ตั้งค่าช่อง/ยศ
│   ├── Channel ID (Check Slip)
│   ├── Channel ID (Notify)
│   ├── Role ID (Checker)
│   └── Role ID (Member)
└── 📋 ดูการตั้งค่าทั้งหมด
```

### 3. ดูสถานะปัจจุบัน

```javascript
const ConfigManager = require('./utils/configManager');

// อ่านค่าเดียว
const apiKey = ConfigManager.get('API_SLIPOK_KEY');

// อ่านทั้งหมด
const allConfig = ConfigManager.loadAll();

// ดูสถานะทั้งหมด
const status = ConfigManager.getConfigStatus();
```

## Priority ของ Config

```
┌─────────────────────────────────────┐
│ 1. Environment Variable (.env)      │ ← Priority สูงสุด
│    (จะใช้ค่านี้ก่อน)                  │
├─────────────────────────────────────┤
│ 2. Config File (logdata.json)       │ ← ใช้ถ้า .env ไม่มี
├─────────────────────────────────────┤
│ 3. Default Values                   │ ← Fallback สุดท้าย
└─────────────────────────────────────┘
```

## ConfigManager API

### `get(key, defaultValue)`
อ่านค่า config โดยค่าที่ได้จะเลือก .env ก่อน แล้วค่อย logdata.json

```javascript
const phone = ConfigManager.get('เบอร์รับเงินวอเลท', '0000000000');
```

### `set(key, value)`
เขียนค่าลง logdata.json

```javascript
ConfigManager.set('API_SLIPOK_KEY', 'SLIPOK...');
```

### `loadAll()`
อ่านทั้ง logdata.json

```javascript
const data = ConfigManager.loadAll();
```

### `saveAll(data)`
เขียนทั้ง logdata.json

```javascript
ConfigManager.saveAll({ /* ... */ });
```

### `getConfigStatus()`
ดูสถานะการตั้งค่าทั้งหมด (ว่าตั้งค่าแล้วหรือยัง และมาจากไหน)

```javascript
const status = ConfigManager.getConfigStatus();
// {
//   'API_SLIPOK_KEY': {
//     label: '🔑 SlipOK API Key',
//     configured: true,
//     fromEnv: true,
//     value: '✓ ตั้งค่าแล้ว',
//     ...
//   },
//   ...
// }
```

## ConfigEmbed API

### `buildStatusEmbed()`
Embed สำหรับแสดงสถานะทั้งหมด

```javascript
const embed = ConfigEmbed.buildStatusEmbed();
await interaction.reply({ embeds: [embed] });
```

### `buildUpdateSuccessEmbed(key, oldValue, newValue)`
Embed สำหรับแสดงเมื่อมีการอัพเดตสำเร็จ

```javascript
const embed = ConfigEmbed.buildUpdateSuccessEmbed(
  'API_SLIPOK_KEY',
  'ค่าเดิม',
  'ค่าใหม่'
);
```

### `buildErrorEmbed(message)`
Embed สำหรับแสดงข้อผิดพลาด

```javascript
const embed = ConfigEmbed.buildErrorEmbed('❌ เกิดข้อผิดพลาด');
```

### `buildDetailEmbed(key)`
Embed สำหรับแสดงข้อมูลเฉพาะ

```javascript
const embed = ConfigEmbed.buildDetailEmbed('API_SLIPOK_KEY');
```

## Schema Definition

ทุก config key มี schema ที่กำหนด:

```javascript
ConfigManager.getSchema()
// {
//   'API_SLIPOK_KEY': {
//     label: '🔑 SlipOK API Key',
//     description: 'API Key จาก SlipOK',
//     type: 'secret',
//     required: false
//   },
//   ...
// }
```

**ประเภท (type):**
- `secret` - ซ่อนค่า (passwords, API keys)
- `text` - ข้อความธรรมดา
- `phone` - เบอร์โทรศัพท์
- `number` - ตัวเลข
- `boolean` - true/false

## Interaction Handlers

ไฟล์ `interactions/configInteractions.js` จัดการ:

### Buttons
- `modal_topup_bank` - เปิด modal ตั้งค่า SlipOK
- `modal_topup_wallet` - เปิด modal ตั้งค่า TrueMoney
- `modal_channel_bank` - เปิด modal ตั้งค่าช่อง/ยศ
- `view_all_config` - แสดงสถานะทั้งหมด
- `reset_config` - รีเซ็ตการตั้งค่า

### Modals
- `modal_topup_bank_submit` - บันทึกค่าธนาคาร
- `modal_topup_wallet_submit` - บันทึกค่าวอเลต
- `modal_channel_bank_submit` - บันทึกค่าช่อง/ยศ

### Select Menus
- `refresh_config` - รีเฟชร์สถานะการตั้งค่า

## ตัวอย่างการใช้

### อ่านค่า
```javascript
const ConfigManager = require('./utils/configManager');

// ง่าย
const key = ConfigManager.get('API_SLIPOK_KEY');

// พร้อม default
const phone = ConfigManager.get('เบอร์รับเงินวอเลท', '0000000000');

// ดูทั้งหมด
const status = ConfigManager.getConfigStatus();
Object.entries(status).forEach(([key, info]) => {
  console.log(`${info.label}: ${info.value}`);
});
```

### เขียนค่า
```javascript
// ผ่าน ConfigManager
ConfigManager.set('API_SLIPOK_KEY', 'SLIPOK...');

// หรือเขียนหลายค่าพร้อม
const data = ConfigManager.loadAll();
data['API_SLIPOK_KEY'] = 'SLIPOK...';
data['SLIPOK_BRANCH_ID'] = '12345';
ConfigManager.saveAll(data);
```

## Legacy Support

ไฟล์ `update/submit_update.js` ยังรองรับ modal IDs เก่า:
- `topup_modal_bank`
- `topup_modal_wallet`
- `channel_modal_bank`

และมีการ fallback ไปใช้ ConfigManager อัตโนมัติ

## Notes

- ⚡ Priority: .env > config file > default
- 🔒 Secret values ไม่แสดงในผู้ใช้ (แค่บอก "✓ ตั้งค่าแล้ว")
- 🎨 UI ใช้ emoji เพื่อให้อ่านง่าย
- 📝 Config file เก็บใน JSON format ให้ readable
- 🔄 Update ผ่าน UI จะบันทึกลง logdata.json ทันที
