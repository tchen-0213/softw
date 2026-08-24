CREATE DATABASE IF NOT EXISTS shopping_platform
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shopping_platform;

CREATE TABLE IF NOT EXISTS deployment_marker (
  id INT PRIMARY KEY AUTO_INCREMENT,
  marker VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO deployment_marker (marker)
SELECT 'docker-init-2026-summer'
WHERE NOT EXISTS (
  SELECT 1 FROM deployment_marker WHERE marker = 'docker-init-2026-summer'
);
