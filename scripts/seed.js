#!/usr/bin/env node
'use strict';

/**
 * Seed script: creates the default admin account, services, sample
 * projects/recent jobs/testimonials, demo bookings and settings.
 * Safe to re-run — skips records that already exist.
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../backend/config/database');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@surveypro.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

async function seedUsers(client) {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['Site Administrator', ADMIN_EMAIL, hash]
  );
  if (rows.length) console.log(`  ✓ admin user: ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`);
  else console.log(`  = admin user already exists: ${ADMIN_EMAIL}`);
}

const SERVICES = [
  ['Boundary Survey', 'boundary-survey', 'Accurate identification and documentation of property boundaries, easements and encroachments.', 'ruler', 1],
  ['Topographical Survey', 'topographical-survey', 'Detailed mapping of terrain, structures, vegetation, elevations and site features.', 'map', 2],
  ['Construction Survey', 'construction-survey', 'Surveying support for construction projects from planning through execution — staking, grading and as-built verification.', 'building-2', 3],
  ['Property Survey', 'property-survey', 'Survey information for property acquisition, development and documentation.', 'clipboard-list', 4],
  ['Site Survey', 'site-survey', 'Detailed site information for planning, design and development decisions.', 'layers', 5],
  ['Geospatial Services', 'geospatial-services', 'Spatial data collection, mapping and analysis using GNSS, drone and GIS technology.', 'compass', 6]
];

async function seedServices(client) {
  for (const [name, slug, description, icon, order] of SERVICES) {
    await client.query(
      `INSERT INTO services (name, slug, description, icon, display_order)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING`,
      [name, slug, description, icon, order]
    );
  }
  console.log('  ✓ services seeded');
}

const PROJECTS = [
  {
    title: 'Riverside Residential Boundary Survey',
    slug: 'riverside-residential-boundary',
    category: 'residential',
    location: 'Riverside Heights, Austin, TX',
    description: 'Full boundary and easement survey for a 0.4-acre residential lot ahead of a home extension. The survey resolved a long-standing fence-line dispute and documented two recorded easements, giving the homeowner a certified plat accepted by the county.',
    challenge: 'The property had conflicting historical plats and a fence built partially over the recorded boundary line.',
    approach: 'We recovered original monuments, re-ran the subdivision parcel calculations and combined GNSS observation with conventional total-station traversing to re-establish the boundary to secondary control.',
    result: 'A certified survey plat was delivered within 10 working days and accepted by the county clerk. The fence line was later corrected using our staking.',
    services: ['Boundary Survey', 'Property Survey'],
    featured: true
  },
  {
    title: 'Meridian Commercial Center Topo & Construction Staking',
    slug: 'meridian-commercial-center',
    category: 'commercial',
    location: 'Meridian Business Park, Dallas, TX',
    description: 'Topographical survey and full construction staking package for a 12,000 m² commercial center including parking, utilities and drainage.',
    challenge: 'A tight construction schedule required the topo survey and staking to overlap without disrupting ongoing demolition works.',
    approach: 'Drone photogrammetry captured the base terrain in two flights, complemented by ground-based utility location and level circuits.',
    result: 'The design team received a 5 cm-accuracy surface model in under a week, and staking was maintained through all construction phases.',
    services: ['Topographical Survey', 'Construction Survey'],
    featured: true
  },
  {
    title: 'Cedar Ridge Land Development Survey',
    slug: 'cedar-ridge-land-development',
    category: 'land_development',
    location: 'Cedar Ridge, Williamson County, TX',
    description: 'Preliminary and final plat survey for a 24-lot residential subdivision, including road alignment, drainage easements and open-space delineation.',
    challenge: 'Varied terrain with a protected creek corridor required careful easement placement.',
    approach: 'Combined drone imagery, GNSS control network and hydrographic spot-levels along the creek corridor.',
    result: 'The final plat was approved on first submission to the county planning commission.',
    services: ['Topographical Survey', 'Site Survey'],
    featured: false
  },
  {
    title: 'Harbor View Construction As-Built Survey',
    slug: 'harbor-view-as-built',
    category: 'construction',
    location: 'Harbor View, Corpus Christi, TX',
    description: 'As-built verification survey for a three-storey mixed-use development, documenting slab levels, column grids and facade alignment against design tolerances.',
    challenge: 'Verification had to be completed while the site remained active for fit-out trades.',
    approach: 'Night-time total-station scanning sessions with a dedicated two-person crew.',
    result: 'All deviations were reported within 48 hours, enabling prompt remediation before handover.',
    services: ['Construction Survey'],
    featured: false
  }
];

async function seedProjects(client) {
  for (const p of PROJECTS) {
    const { rows } = await client.query(
      `INSERT INTO projects (title, slug, category, location, description, challenge, approach, result, services, completion_date, cover_image_url, featured, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [p.title, p.slug, p.category, p.location, p.description, p.challenge, p.approach, p.result, p.services,
        new Date(Date.now() - Math.floor(Math.random() * 400 + 60) * 86400000).toISOString().slice(0, 10),
        `/assets/images/illustrations/project-${p.slug}.svg`, p.featured]
    );
    if (rows.length) {
      const projectId = rows[0].id;
      for (let i = 1; i <= 3; i++) {
        await client.query(
          `INSERT INTO project_images (project_id, image_url, caption, display_order) VALUES ($1,$2,$3,$4)`,
          [projectId, `/assets/images/illustrations/project-${p.slug}.svg?v=${i}`, `${p.title} — gallery image ${i}`, i]
        );
      }
    }
  }
  console.log('  ✓ projects + gallery images seeded');
}

const RECENT_JOBS = [
  ['Boundary re-survey — Oakwood Lane', 'Oakwood Lane, Austin, TX', 'boundary-survey', 'Re-establishment of a disputed rear boundary with new monument set and certified plat.', 6],
  ['Drone topographic survey — Pine Hollow', 'Pine Hollow, Round Rock, TX', 'topographical-survey', 'UAV photogrammetric survey covering 18 hectares for a detention-pond redesign.', 13],
  ['Construction staking — Spectrum Office Park', 'Spectrum Office Park, Dallas, TX', 'construction-survey', 'Curb, utility and building staking for phase 2 of the office park.', 21]
];

async function seedRecentJobs(client) {
  for (const [title, location, serviceSlug, description, daysAgo] of RECENT_JOBS) {
    const { rows: existing } = await client.query('SELECT id FROM recent_jobs WHERE title = $1', [title]);
    if (existing.length) continue;
    const { rows: svc } = await client.query('SELECT id FROM services WHERE slug = $1', [serviceSlug]);
    await client.query(
      `INSERT INTO recent_jobs (title, location, service_id, description, job_date, cover_image_url, published)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)`,
      [title, location, svc.length ? svc[0].id : null, description,
        new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10),
        '/assets/images/illustrations/recent-job.svg']
    );
  }
  console.log('  ✓ recent jobs seeded');
}

const TESTIMONIALS = [
  ['Margaret Coleman', 'Coleman Property Group', 'SurveyPro delivered our boundary survey ahead of schedule and the documentation was flawless. The county accepted the plat without a single query.', 5],
  ['Daniel Reyes', 'Reyes Construction', 'Their staking crew kept our schedule on track across three phases. Clear communication, precise work, zero rework needed.', 5],
  ['Alicia Nguyen', 'Northgate Developments', 'The topographic model they produced became the backbone of our whole site design. Professional from quote to delivery.', 4]
];

async function seedTestimonials(client) {
  for (const [name, company, message, rating] of TESTIMONIALS) {
    const { rows: existing } = await client.query(
      'SELECT id FROM testimonials WHERE client_name = $1 AND company = $2', [name, company]);
    if (existing.length) continue;
    await client.query(
      `INSERT INTO testimonials (client_name, company, message, rating, published)
       VALUES ($1,$2,$3,$4,TRUE)`,
      [name, company, message, rating]
    );
  }
  console.log('  ✓ testimonials seeded');
}

async function seedBookings(client) {
  const { rows: existing } = await client.query('SELECT COUNT(*)::int AS n FROM bookings');
  if (existing[0].n > 0) return;

  const { rows: svc } = await client.query("SELECT id, name FROM services WHERE slug IN ('boundary-survey','topographical-survey')");
  const boundary = svc.find((s) => s.name === 'Boundary Survey');
  const topo = svc.find((s) => s.name === 'Topographical Survey');

  const demo = [
    {
      ref: 'SRV-2026-00482', name: 'James Whitfield', email: 'james.whitfield@example.com', phone: '+1 512 555 0184',
      address: '1402 Oakwood Lane', city: 'Austin', type: 'Residential', size: '0.25 acre',
      serviceId: boundary ? boundary.id : null, date: 3, status: 'pending'
    },
    {
      ref: 'SRV-2026-00483', name: 'Laura Simmons', email: 'laura.simmons@example.com', phone: '+1 214 555 0117',
      address: '88 Meridian Parkway, Unit 4', city: 'Dallas', type: 'Commercial', size: '2 acres',
      serviceId: topo ? topo.id : null, date: 5, status: 'confirmed'
    }
  ];

  for (const b of demo) {
    const { rows } = await client.query(
      `INSERT INTO bookings (booking_reference, service_id, full_name, email, phone, property_address, city, property_type, property_size, preferred_date, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [b.ref, b.serviceId, b.name, b.email, b.phone, b.address, b.city, b.type, b.size,
        new Date(Date.now() + b.date * 86400000).toISOString().slice(0, 10),
        'Demo booking created by the seed script.', b.status]
    );
    await client.query(
      `INSERT INTO notifications (title, message, type)
       VALUES ($1, $2, 'booking')`,
      [`New booking ${b.ref}`, `${b.name} requested a survey at ${b.address}, ${b.city}.`]
    );
  }
  console.log('  ✓ demo bookings + notifications seeded');
}

async function seedSettings(client) {
  const settings = {
    stats_years_experience: '10',
    stats_projects_completed: '500',
    stats_clients_served: '350',
    stats_services_offered: '15',
    contact_address: '720 Commerce Street, Suite 210, Austin, TX 78701',
    contact_phone: '+1 (512) 555-0139',
    contact_email: 'info@surveypro.example.com',
    contact_hours: 'Mon – Fri: 8:00 AM – 5:30 PM · Sat: 9:00 AM – 1:00 PM'
  };
  for (const [k, v] of Object.entries(settings)) {
    await client.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES ($1,$2)
       ON CONFLICT (setting_key) DO NOTHING`,
      [k, v]
    );
  }
  console.log('  ✓ settings seeded');
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }
  await db.getPool().query('SELECT 1');
  await db.withTransaction(async (client) => {
    await seedUsers(client);
    await seedServices(client);
    await seedProjects(client);
    await seedRecentJobs(client);
    await seedTestimonials(client);
    await seedBookings(client);
    await seedSettings(client);
  });
  console.log('Seed complete.');
  await db.closePool();
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
