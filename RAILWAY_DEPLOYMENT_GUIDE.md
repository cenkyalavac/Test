# Railway Deployment Guide - Translation QA Tool

This guide covers deployment for both **single-service** and **dual-service** configurations on Railway.

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Single Service (Recommended for simplicity)
**Frontend + Backend in ONE Railway service**

**Pros:**
- ✅ No CORS issues
- ✅ Lower cost (1 service)
- ✅ Simpler configuration
- ✅ Faster loads (same origin)

**Cons:**
- ❌ Combined service size
- ❌ All requests use same dyno

**Cost:** 1 Railway service

---

### Option 2: Dual Service (Recommended for scale)
**Frontend and Backend in SEPARATE Railway services**

**Pros:**
- ✅ Separate scaling
- ✅ Independent deployments
- ✅ Better resource allocation

**Cons:**
- ⚠️ CORS setup required
- ⚠️ Environment variable needed
- ⚠️ 2 services = 2x cost

**Cost:** 2 Railway services

---

## 📋 DEPLOYMENT STEPS

### **OPTION 1: Single Service Deployment**

#### Step 1: Deploy to Railway
```bash
railway login
railway init
railway deploy
```

#### Step 2: Railway Configuration
In Railway console for your service:
1. Go to **Variables**
2. **NO** special environment variables needed
3. Start command: `python -m src.backend.api`
4. Node version: 18+
5. Python version: 3.9+

#### Step 3: Deployment Happens Automatically
- Railway runs `npm run build` → creates `dist/` folder
- Flask backend serves both:
  - `/` → Frontend (index.html)
  - `/assets/*` → Static files
  - `/api/*` → API endpoints

**Frontend will auto-detect:** Empty `API_BASE_URL` = relative paths = `http://your-railway-app.railway.app/api/files/parse`

---

### **OPTION 2: Dual Service Deployment (Your Current Setup)**

#### Service 1: Frontend
```
Service Name: translation-qa-frontend
```

**Railway Settings:**
- Build command: `npm install && npm run build`
- Start command: (No start command needed - static files)
- Publish Directory: `dist`
- Environment Variables:
  ```
  VITE_API_URL=https://translation-qa-backend.railway.app
  ```

**Replace `translation-qa-backend.railway.app` with YOUR backend service URL**

#### Service 2: Backend
```
Service Name: translation-qa-backend
```

**Railway Settings:**
- Start command: `python -m src.backend.api`
- Environment Variables: (None needed)

#### Step 2: Connect Services
In Railway console:
1. Create the two services above
2. Get backend service URL (e.g., `https://translation-qa-backend.railway.app`)
3. In **Frontend** service → Variables:
   ```
   VITE_API_URL=https://translation-qa-backend.railway.app
   ```
4. Redeploy frontend service

#### Step 3: Verify
- Frontend: `https://translation-qa-frontend.railway.app`
- Backend: `https://translation-qa-backend.railway.app`
- API: `https://translation-qa-backend.railway.app/api/health`

---

## 🔧 ENVIRONMENT VARIABLES

### Frontend Service (`VITE_API_URL`)
```bash
# If backend is at a different domain:
VITE_API_URL=https://backend-service-name.railway.app

# If single service deployment:
# (leave blank or don't set - auto-detected)
```

### Backend Service
```bash
# No special variables needed
# Flask auto-detects and configures everything
```

---

## 🧪 LOCAL TESTING

### Test Single Service Flow
```bash
npm run build                      # Create dist/
python -m src.backend.api          # Start backend
# Visit: http://localhost:8000
```

### Test Dual Service Flow
```bash
# Terminal 1 - Backend
python -m src.backend.api          # http://localhost:8000

# Terminal 2 - Frontend Dev Server
VITE_API_URL=http://localhost:8000 npm run dev
# Visit: http://localhost:5173
```

---

## ✅ VERIFICATION CHECKLIST

### Single Service
- [ ] Backend serves frontend at `/`
- [ ] Assets load from `/assets/*`
- [ ] API endpoints respond at `/api/health`
- [ ] File upload works
- [ ] Dashboard displays results

### Dual Service
- [ ] Frontend loads from frontend domain
- [ ] `VITE_API_URL` env var is set correctly
- [ ] Backend API responds at `/api/health`
- [ ] File upload works (cross-origin)
- [ ] Dashboard displays results

---

## 🐛 TROUBLESHOOTING

### Error: "Network error: Unable to connect to server"
**Solution:**
1. Check `VITE_API_URL` is set correctly
2. Verify backend service is running
3. Check backend domain is accessible
4. Run `curl https://backend-url.railway.app/api/health`

### Error: "CORS error" or "Access denied"
**Solution:**
1. Backend CORS is configured to allow all origins
2. Verify both services are properly deployed
3. Check browser console for full error

### Error: "502 Bad Gateway"
**Solution:**
1. Backend crashed or isn't running
2. Check Railway logs: `railway logs`
3. Ensure Python dependencies are installed

---

## 📊 COMPARING OPTIONS

| Feature | Single Service | Dual Service |
|---------|---|---|
| Simplicity | ✅ Easy | ⚠️ Complex |
| Cost | ✅ Lower | ❌ Higher |
| CORS Issues | ✅ None | ❌ Requires setup |
| Scaling | ❌ Limited | ✅ Independent |
| Performance | ✅ Fast (same origin) | ⚠️ Cross-origin |
| Configuration | ✅ Auto | ❌ Manual |

---

## 🎯 RECOMMENDED APPROACH

**For MVP/Small Scale:** Use **Single Service**
- Deploy everything together
- Simpler configuration
- Lower cost
- Perfect for initial launch

**For Production/Scale:** Use **Dual Service**
- Scale frontend and backend independently
- Separate concerns
- More control
- Better for high traffic

---

## 📝 API CONFIGURATION PRIORITY

The frontend auto-detects API URL in this order:

1. **Environment Variable** (highest priority)
   ```
   VITE_API_URL=https://custom-api.com
   ```

2. **Development Localhost**
   ```
   http://localhost:8000 (only if running on localhost)
   ```

3. **Production Same-Origin** (default)
   ```
   Empty string = relative paths = same domain
   ```

---

## 🚀 QUICK START COMMANDS

### Deploy Single Service
```bash
railway login
railway init
railway deploy
```

### Deploy Dual Service
```bash
# Frontend service
railway init
railway deploy

# Backend service (separate project/directory)
railway init
railway deploy
```

---

## 📞 SUPPORT

For issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Test API locally first
4. Check backend health: `/api/health`

---

**Version:** 1.0
**Last Updated:** 2026-01-22
**Compatible With:** Single & Dual Railway Deployments
