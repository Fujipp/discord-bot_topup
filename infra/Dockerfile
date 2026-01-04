# ==========================================
# Build & Production Image
# ==========================================
# ใช้ alpine เพื่อให้ image เล็กลง
FROM node:20-alpine AS production

# ตั้งค่า working directory
WORKDIR /app

# ติดตั้ง dependencies ที่จำเป็นสำหรับ sharp (image processing)
RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++

# Copy package files ก่อนเพื่อ cache layer ได้ดี
COPY package*.json ./

# ติดตั้ง production dependencies เท่านั้น
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# สร้าง directories ที่จำเป็น
RUN mkdir -p data update

# ตั้งค่า environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check สำหรับ Azure/Container
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

# รันแอป
CMD ["npm", "start"]
