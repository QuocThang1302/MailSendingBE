-- Add scheduler queue and worker lock tables for scheduled campaigns

CREATE TABLE IF NOT EXISTS worker_locks (
  lock_key VARCHAR(150) PRIMARY KEY,
  owner_id VARCHAR(150) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_worker_locks_expires_at
  ON worker_locks(expires_at);

CREATE TABLE IF NOT EXISTS campaign_dispatch_queue (
  id SERIAL PRIMARY KEY,
  campaign_id INT NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) DEFAULT 'scheduled',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts INT DEFAULT 0,
  locked_by VARCHAR(150),
  locked_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_dispatch_queue_status_available
  ON campaign_dispatch_queue(status, available_at);

CREATE INDEX IF NOT EXISTS idx_campaign_dispatch_queue_user
  ON campaign_dispatch_queue(user_id);
