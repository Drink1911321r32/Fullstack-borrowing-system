# Fullstack Borrowing System - Deployment Guide

## 📋 ข้อกำหนดก่อน Deploy

### 1. ติดตั้ง Git
ดาวน์โหลด: https://git-scm.com/download/win

### 2. สร้างฐานข้อมูล MySQL บนคลาวด์
เลือกหนึ่งในตัวเลือกเหล่านี้:
- **PlanetScale** (แนะนำ - Free tier): https://planetscale.com/
- **Railway**: https://railway.app/
- **AWS RDS**: https://aws.amazon.com/rds/
- **Aiven**: https://aiven.io/

### 3. สร้างบัญชี Vercel
สมัคร: https://vercel.com/signup

---

## 🚀 ขั้นตอนการ Deploy

### Step 1: ติดตั้ง Git และเตรียมโปรเจค

```bash
# ตรวจสอบ Git
git --version

# เข้าไปในโฟลเดอร์โปรเจค
cd c:\Users\dinki\Desktop\fullstack-app

# สร้าง Git repository
git init

# กำหนดค่า Git (ใส่ชื่อและอีเมลของคุณ)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# เพิ่มไฟล์ทั้งหมด
git add .

# Commit ครั้งแรก
git commit -m "Initial commit - Ready for Vercel deployment"
```

### Step 2: Push โปรเจคขึ้น GitHub

```bash
# สร้าง repository ใหม่ที่ GitHub: https://github.com/new
# แล้วรันคำสั่งเหล่านี้ (แทนที่ YOUR_USERNAME ด้วยชื่อ GitHub ของคุณ)

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fullstack-app.git
git push -u origin main
```

### Step 3: Deploy บน Vercel

#### ผ่าน Vercel Dashboard (แนะนำ):
1. เข้า https://vercel.com/new
2. เลือก "Import Git Repository"
3. เชื่อมต่อกับ GitHub account
4. เลือก repository ที่สร้างไว้
5. กำหนดค่าดังนี้:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### ผ่าน Vercel CLI:
```bash
# ติดตั้ง Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 4: ตั้งค่า Environment Variables บน Vercel

ไปที่ Vercel Dashboard → Project Settings → Environment Variables

เพิ่มตัวแปรเหล่านี้:

#### Backend Variables:
```
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key
DB_HOST=your_cloud_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=borrow_return_system
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
SESSION_SECRET=your_session_secret
FRONTEND_URL=https://your-vercel-app.vercel.app
```

#### Frontend Variables (ถ้ามี):
```
VITE_API_URL=https://your-vercel-app.vercel.app/api
```

---

## 🔧 สิ่งสำคัญที่ต้องแก้ไข

### 1. ปรับ Backend ให้รองรับ Serverless
Backend ปัจจุบันต้องแก้ไขเพื่อรองรับ Serverless Functions บน Vercel

### 2. ตั้งค่า CORS
แก้ไขไฟล์ `backend/server.js` เพิ่ม:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### 3. อัพเดต API Endpoints ใน Frontend
แก้ไข URL ทั้งหมดใน `frontend/src/api/` ให้ใช้:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

---

## 📊 ทางเลือกสำหรับ Backend (แนะนำ)

เนื่องจาก Vercel เหมาะกับ static sites และ serverless functions มากกว่า:

### ตัวเลือก 1: Deploy Backend แยก
- **Railway**: https://railway.app/ (รองรับ MySQL และ Node.js)
- **Render**: https://render.com/ (Free tier พร้อม Database)
- **Fly.io**: https://fly.io/

### ตัวเลือก 2: ใช้ Vercel Serverless Functions
- ต้องปรับโครงสร้าง Backend ให้เป็น API routes
- จัดการไฟล์ static (uploads) ผ่าน Cloud Storage (S3, Cloudinary)

---

## ✅ Checklist ก่อน Deploy

- [ ] ติดตั้ง Git แล้ว
- [ ] สร้าง GitHub repository
- [ ] สร้างฐานข้อมูล MySQL บนคลาวด์
- [ ] มีบัญชี Vercel
- [ ] ตั้งค่า Environment Variables ครบ
- [ ] ทดสอบการเชื่อมต่อฐานข้อมูล
- [ ] แก้ไข CORS settings
- [ ] อัพเดต API URLs

---

## 🔍 การตรวจสอบหลัง Deploy

1. เช็ค Deployment logs บน Vercel Dashboard
2. ทดสอบ API endpoints
3. ตรวจสอบการเชื่อมต่อฐานข้อมูล
4. ทดสอบ Authentication
5. ทดสอบ File uploads

---

## 🆘 แก้ปัญหา

### Build failed?
- ตรวจสอบ logs ใน Vercel Dashboard
- ตรวจสอบ dependencies ใน package.json
- ตรวจสอบ node version

### Database connection error?
- ตรวจสอบ Environment Variables
- ตรวจสอบ IP whitelist ของฐานข้อมูล
- ทดสอบ connection string

### CORS errors?
- ตรวจสอบ CORS configuration
- เช็ค FRONTEND_URL environment variable

---

## 📞 ติดต่อ & สนับสนุน

หากมีปัญหาหรือคำถาม:
- ตรวจสอบ Vercel Documentation: https://vercel.com/docs
- ดู deployment logs
- ตรวจสอบ environment variables

---

**หมายเหตุ:** โปรเจคนี้ต้องการการปรับแต่งเพิ่มเติมเพื่อรองรับ Serverless Architecture บน Vercel อย่างเต็มรูปแบบ
