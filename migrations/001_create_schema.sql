-- SurveyPro schema: users, clients, services, bookings, projects,
-- recent jobs, testimonials, messages, notifications, settings.
-- Portable PostgreSQL — no vendor-specific features.

-- ── USERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','surveyor','staff')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── CLIENTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(180),
  phone      VARCHAR(40),
  address    VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone);

-- ── SERVICES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(140) NOT NULL UNIQUE,
  description   TEXT,
  icon          VARCHAR(60)  NOT NULL DEFAULT 'ruler',
  image_url     VARCHAR(500),
  status        VARCHAR(20)  NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services (slug);
CREATE INDEX IF NOT EXISTS idx_services_status_order ON services (status, display_order);

-- ── BOOKINGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                SERIAL PRIMARY KEY,
  booking_reference VARCHAR(30) NOT NULL UNIQUE,
  client_id         INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  service_id        INTEGER REFERENCES services(id) ON DELETE SET NULL,
  full_name         VARCHAR(120) NOT NULL,
  email             VARCHAR(180) NOT NULL,
  phone             VARCHAR(40)  NOT NULL,
  property_address  VARCHAR(300) NOT NULL,
  city              VARCHAR(120) NOT NULL,
  property_type     VARCHAR(60),
  property_size     VARCHAR(60),
  preferred_date    DATE,
  preferred_time    VARCHAR(20),
  alternative_date  DATE,
  description       TEXT,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','assigned','in_progress','completed','rescheduled','cancelled','rejected')),
  assigned_surveyor INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings (booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_preferred_date ON bookings (preferred_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at);

-- ── BOOKING ATTACHMENTS (metadata only — files live in object storage) ──
CREATE TABLE IF NOT EXISTS booking_attachments (
  id                SERIAL PRIMARY KEY,
  booking_id        INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  storage_provider  VARCHAR(30)  NOT NULL,
  storage_key       VARCHAR(500) NOT NULL,
  file_url          VARCHAR(800) NOT NULL,
  mime_type         VARCHAR(120),
  file_size         BIGINT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_attachments_booking ON booking_attachments (booking_id);

-- ── PROJECTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(180) NOT NULL,
  slug            VARCHAR(200) NOT NULL UNIQUE,
  category        VARCHAR(60)  NOT NULL CHECK (category IN ('residential','commercial','construction','land_development','topographical','boundary')),
  location        VARCHAR(180),
  description     TEXT,
  challenge       TEXT,
  approach        TEXT,
  result          TEXT,
  services        TEXT[],
  completion_date DATE,
  cover_image_url VARCHAR(800),
  cover_image_key VARCHAR(500),
  featured        BOOLEAN      NOT NULL DEFAULT FALSE,
  published       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects (category);
CREATE INDEX IF NOT EXISTS idx_projects_published ON projects (published);

-- ── PROJECT IMAGES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_images (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_url     VARCHAR(800) NOT NULL,
  storage_key   VARCHAR(500),
  caption       VARCHAR(200),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_images_project ON project_images (project_id);

-- ── RECENT JOBS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recent_jobs (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(180) NOT NULL,
  location        VARCHAR(180),
  service_id      INTEGER REFERENCES services(id) ON DELETE SET NULL,
  description     TEXT,
  job_date        DATE,
  cover_image_url VARCHAR(800),
  published       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recent_jobs_published ON recent_jobs (published);

-- ── TESTIMONIALS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id          SERIAL PRIMARY KEY,
  client_name VARCHAR(120) NOT NULL,
  company     VARCHAR(150),
  message     TEXT NOT NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  photo_url   VARCHAR(800),
  published   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials (published);

-- ── MESSAGES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(180) NOT NULL,
  phone      VARCHAR(40),
  subject    VARCHAR(200),
  message    TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','replied','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  message    TEXT,
  type       VARCHAR(30) NOT NULL DEFAULT 'info',
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);

-- ── SETTINGS (key/value, configurable stats etc.) ────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id            SERIAL PRIMARY KEY,
  setting_key   VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings (setting_key);

-- ── AUDIT LOG ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(120) NOT NULL,
  entity     VARCHAR(60),
  entity_id  INTEGER,
  details    TEXT,
  ip_address VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id);
