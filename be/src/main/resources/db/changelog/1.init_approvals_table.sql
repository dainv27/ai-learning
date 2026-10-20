-- ChangeLog
-- Date: 2023-09-25
-- Author: AI
-- Description: Create approvals table

CREATE TABLE approvals (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_id ON approvals(request_id);
CREATE INDEX idx_user_id ON approvals(user_id);