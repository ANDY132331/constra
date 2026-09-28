-- Migration 011: Add geofence_radius to projects
-- Stores the GPS clock-in allowed radius per project (metres). Default 500m.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS geofence_radius integer;
