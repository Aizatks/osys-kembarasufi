#!/usr/bin/env node
/**
 * Migration: Add frequency_days column to task_templates
 * Run: node scripts/migrate-frequency-days.js
 */
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function migrate() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Checking if frequency_days column exists...');
  const { error: checkError } = await supabase
    .from('task_templates')
    .select('frequency_days')
    .limit(1);

  if (!checkError) {
    console.log('✅ Column already exists. No migration needed.');
    process.exit(0);
  }

  console.log('Column not found. Please run this SQL in your Supabase SQL editor:');
  console.log('');
  console.log('ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS frequency_days integer[] DEFAULT NULL;');
  console.log('');
  console.log('Go to: https://supabase.com/dashboard/project/xxrsrdxqfcbmbjidlucy/sql');
}

migrate().catch(console.error);
