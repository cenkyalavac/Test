# Translation QA Tool - Deployment Guide

## 🚀 Deployment Options

### Option 1: Netlify (Frontend Only)
Recommended for quick frontend deployment with CI/CD.

#### Prerequisites
- Netlify account (free tier available)
- Git repository pushed to GitHub/GitLab/Bitbucket
- Netlify CLI installed ✅

#### Steps

1. **Login to Netlify**
```bash
netlify login
```

2. **Build the Frontend**
```bash
npm run build
# Creates optimized dist/ folder (224 KB gzipped)
```

3. **Deploy to Netlify**
```bash
# Option A: Deploy directly
netlify deploy --prod --dir=dist

# Option B: Connect repository for CI/CD
netlify init
```

4. **Backend Deployment**
Deploy the Flask backend separately (see Option 3)

### Option 2: Vercel (Frontend)
Alternative frontend hosting with excellent React support.

```bash
npm install -g vercel
vercel
```

### Option 3: Heroku/Railway (Backend + Frontend)
Full-stack deployment with both frontend and backend.

#### Backend Deployment (Heroku example)

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create Procfile**
```bash
echo "web: python -m src.backend.api" > Procfile
```

3. **Deploy**
```bash
heroku create translation-qa-tool
git push heroku main
```

#### Set Environment Variables
```bash
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set GEMINI_API_KEY=AIza...
heroku config:set FLASK_ENV=production
```

### Option 4: Docker (Containerized Deployment)
For maximum portability and consistency.

#### Dockerfile
```dockerfile
# Frontend build
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Backend runtime
FROM python:3.11-slim
WORKDIR /app

# Copy frontend build
COPY --from=frontend-builder /app/dist ./dist

# Install backend dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy backend code
COPY src ./src

# Expose ports
EXPOSE 5000 3000

# Run both services
CMD ["python", "-m", "src.backend.api"]
```

#### Build and Run
```bash
docker build -t translation-qa-tool .
docker run -p 5000:5000 -e OPENAI_API_KEY=sk-... translation-qa-tool
```

### Option 5: AWS (Production Grade)

#### Using AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p python-3.11 translation-qa-tool

# Create environment
eb create production

# Set environment variables
eb setenv OPENAI_API_KEY=sk-...

# Deploy
eb deploy
```

#### Using AWS S3 + CloudFront + Lambda
- Frontend: S3 + CloudFront CDN
- Backend: Lambda + API Gateway
- Database: DynamoDB (if needed)

### Option 6: Railway (Recommended for Simplicity)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Connect Railway**
- Visit railway.app
- Connect GitHub account
- Select repository
- Configure environment variables

3. **Deploy**
```bash
# Railway automatically builds and deploys on push
```

---

## 📋 Pre-Deployment Checklist

### Backend
- [ ] Environment variables configured (OPENAI_API_KEY, GEMINI_API_KEY)
- [ ] HTTPS enabled
- [ ] CORS configured for frontend domain
- [ ] Rate limiting enabled
- [ ] Error logging setup
- [ ] Database backups configured (if using)
- [ ] Security headers enabled
- [ ] Input validation active

### Frontend
- [ ] Production build created (`npm run build`)
- [ ] Environment variables for API endpoint
- [ ] Analytics configured
- [ ] Error tracking setup
- [ ] Performance monitoring enabled
- [ ] SSL certificate installed

### Security
- [ ] API keys not in code
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Security headers present
- [ ] Dependencies audited

---

## 🔐 Environment Variables

### Backend (.env)
```bash
# Flask
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-secret-key-here

# AI Services
OPENAI_API_KEY=sk-your-key
GEMINI_API_KEY=AIza-your-key

# Security
MAX_FILE_SIZE=52428800  # 50MB
MAX_SEGMENTS=10000

# Database (if using)
DATABASE_URL=postgresql://user:password@host/db

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env.production)
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```

---

## 📊 Performance Optimization

### Frontend Optimization
```bash
# Enable gzip compression
npm run build

# Results:
# - HTML: 0.45 KB (gzipped: 0.29 KB)
# - CSS: 5.91 KB (gzipped: 1.50 KB)
# - JS: 224.07 KB (gzipped: 68.80 KB)
```

### Backend Optimization
```python
# Enable caching
# Implement rate limiting
# Use connection pooling
# Enable gzip responses
```

### CDN Configuration
- Serve static assets from CDN
- Cache buster for new versions
- Set appropriate cache headers

---

## 🧪 Testing Before Deployment

### Local Testing
```bash
# Backend
python -m src.backend.qa.test_integration

# Frontend
npm test

# Full Build
npm run build
```

### Staging Deployment
1. Deploy to staging environment
2. Run smoke tests
3. Performance testing
4. Security scanning
5. Load testing

---

## 📈 Monitoring & Logging

### Application Monitoring
- CPU/Memory usage
- Response times
- Error rates
- Request throughput

### Error Tracking
- Sentry integration
- Error notifications
- Stack trace collection

### Performance Monitoring
- Web Vitals
- API response times
- File parsing performance
- AI prediction latency

---

## 🚨 Rollback Procedure

### If deployment fails
```bash
# Docker
docker run -p 5000:5000 translation-qa-tool:previous-version

# Heroku
heroku releases
heroku rollback v{number}

# Netlify
netlify deploy --prod --alias=rollback
```

---

## 📞 Post-Deployment

### Verification
1. Check health endpoint: `/api/health`
2. Test file upload
3. Test QA checking
4. Test AI predictions
5. Monitor logs

### Continuous Monitoring
- Set up alerts for errors
- Monitor API latency
- Track file parsing time
- Monitor AI prediction costs
- Daily health checks

---

## 🎯 Quick Deploy Commands

### Netlify (Frontend)
```bash
npm run build && netlify deploy --prod --dir=dist
```

### Heroku (Full Stack)
```bash
git push heroku main
```

### Railway (Full Stack)
```bash
git push
# Auto-deploys on push
```

### Docker
```bash
docker build -t translation-qa-tool . && \
docker run -p 5000:5000 -p 3000:3000 translation-qa-tool
```

---

## 📚 Additional Resources

- [Netlify Deployment Docs](https://docs.netlify.com/)
- [Heroku Getting Started](https://devcenter.heroku.com/)
- [Railway Documentation](https://docs.railway.app/)
- [AWS Deployment Guide](https://aws.amazon.com/getting-started/)
- [Docker Documentation](https://docs.docker.com/)

---

**Recommended Option**: Railway or Netlify for simplicity, AWS for enterprise scalability

Last Updated: January 22, 2026
