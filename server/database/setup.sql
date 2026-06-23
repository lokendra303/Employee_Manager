-- Run once as MySQL root (MySQL Workbench or command line)
-- Creates database + app user used by server/.env

CREATE DATABASE IF NOT EXISTS attendance_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'attendance_app'@'localhost' IDENTIFIED BY 'AttendanceApp@2024';

GRANT ALL PRIVILEGES ON attendance_manager.* TO 'attendance_app'@'localhost';

FLUSH PRIVILEGES;
