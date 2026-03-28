-- =========================================
-- EMAIL MARKETING SYSTEM — FULL SCHEMA
-- Hệ thống Email Marketing Cá Nhân Hóa
-- Phiên bản hoàn chỉnh, chạy từ đầu
-- =========================================

DROP DATABASE IF EXISTS email_marketing_system;
CREATE DATABASE email_marketing_system;
\c email_marketing_system;


-- =========================================
-- 1. USERS — Tài khoản quản trị
-- =========================================

CREATE TABLE users (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    password     TEXT NOT NULL,
    role         VARCHAR(50) DEFAULT 'admin',
    avatar_url   TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    last_login   TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP
);


-- =========================================
-- 2. EMAIL ACCOUNTS — Tài khoản SMTP gửi mail
-- =========================================

CREATE TABLE email_accounts (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    email_address   VARCHAR(150) NOT NULL,
    display_name    VARCHAR(150),
    smtp_host       VARCHAR(150),
    smtp_port       INT,
    smtp_username   VARCHAR(150),
    smtp_password   TEXT,
    use_tls         BOOLEAN DEFAULT TRUE,
    is_default      BOOLEAN DEFAULT FALSE,
    -- 'active', 'inactive', 'error'
    status          VARCHAR(50) DEFAULT 'active',
    daily_limit     INT DEFAULT 500,       -- Giới hạn gửi / ngày
    sent_today      INT DEFAULT 0,
    last_used_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 3. EMAIL CONTACTS — Danh sách liên hệ
-- =========================================

CREATE TABLE email_contacts (
    id           SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    email        VARCHAR(150) NOT NULL,
    first_name   VARCHAR(100),
    last_name    VARCHAR(100),
    phone        VARCHAR(50),
    company      VARCHAR(150),
    city         VARCHAR(100),
    country      VARCHAR(100),
    language     VARCHAR(20) DEFAULT 'vi',
    -- 'active', 'unsubscribed', 'bounced', 'blocked'
    email_status VARCHAR(50) DEFAULT 'active',
    source       VARCHAR(100),              -- Nguồn thêm vào: 'import', 'form', 'manual'
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP
);

CREATE INDEX idx_contacts_email   ON email_contacts(email);
CREATE INDEX idx_contacts_user    ON email_contacts(user_id);
CREATE INDEX idx_contacts_status  ON email_contacts(email_status);


-- =========================================
-- 4. CONTACT TAGS — Nhãn phân loại liên hệ
-- =========================================

CREATE TABLE contact_tags (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    tag_name   VARCHAR(100) NOT NULL,
    color      VARCHAR(20) DEFAULT '#888888',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_tag_map (
    id         SERIAL PRIMARY KEY,
    contact_id INT REFERENCES email_contacts(id) ON DELETE CASCADE,
    tag_id     INT REFERENCES contact_tags(id) ON DELETE CASCADE,
    added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact_id, tag_id)
);


-- =========================================
-- 5. DYNAMIC FIELDS — Trường tùy chỉnh
-- =========================================

CREATE TABLE dynamic_fields (
    id           SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    field_name   VARCHAR(100) NOT NULL,
    field_label  VARCHAR(150),
    -- 'text', 'number', 'date', 'boolean', 'url'
    field_type   VARCHAR(50) DEFAULT 'text',
    is_required  BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_field_values (
    id         SERIAL PRIMARY KEY,
    contact_id INT REFERENCES email_contacts(id) ON DELETE CASCADE,
    field_id   INT REFERENCES dynamic_fields(id) ON DELETE CASCADE,
    value      TEXT,
    UNIQUE(contact_id, field_id)
);

CREATE INDEX idx_field_values_contact ON contact_field_values(contact_id);


-- =========================================
-- 6. CONTACT SEGMENTS — Phân khúc liên hệ động
-- =========================================
-- Nhóm liên hệ theo điều kiện JSON, tự cập nhật khi chạy campaign

CREATE TABLE contact_segments (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    segment_name        VARCHAR(150) NOT NULL,
    description         TEXT,
    -- Điều kiện JSON. Ví dụ:
    -- {"operator":"AND","conditions":[
    --   {"field":"city","op":"eq","value":"HCM"},
    --   {"field":"email_status","op":"eq","value":"active"}
    -- ]}
    conditions          JSONB NOT NULL DEFAULT '{}',
    is_dynamic          BOOLEAN DEFAULT TRUE,
    contact_count       INT DEFAULT 0,
    last_evaluated_at   TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP
);

-- Cache danh sách contact theo segment (cập nhật khi evaluate)
CREATE TABLE contact_segment_map (
    id         SERIAL PRIMARY KEY,
    segment_id INT REFERENCES contact_segments(id) ON DELETE CASCADE,
    contact_id INT REFERENCES email_contacts(id) ON DELETE CASCADE,
    added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(segment_id, contact_id)
);

CREATE INDEX idx_segment_map_segment ON contact_segment_map(segment_id);
CREATE INDEX idx_segment_map_contact ON contact_segment_map(contact_id);


-- =========================================
-- 7. EMAIL TEMPLATES — Mẫu email HTML
-- =========================================
-- Hỗ trợ placeholder cá nhân hóa: {{first_name}}, {{greeting}}, v.v.

CREATE TABLE email_templates (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    template_name   VARCHAR(150) NOT NULL,
    subject         VARCHAR(255),
    preview_text    VARCHAR(255),           -- Dòng tóm tắt hiển thị trong hộp thư
    content_html    TEXT,
    content_text    TEXT,                   -- Phiên bản plain text fallback
    version         INT DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP
);


-- =========================================
-- 8. PERSONALIZATION RULES — Quy tắc cá nhân hóa nội dung
-- =========================================
-- Thay thế placeholder trong template theo điều kiện của từng contact
-- Ví dụ: nếu city = "HCM" => {{greeting}} = "Xin chào khách HCM!"
--        ngược lại          => {{greeting}} = "Xin chào quý khách!"

CREATE TABLE personalization_rules (
    id               SERIAL PRIMARY KEY,
    user_id          INT REFERENCES users(id) ON DELETE CASCADE,
    template_id      INT REFERENCES email_templates(id) ON DELETE CASCADE,
    rule_name        VARCHAR(150) NOT NULL,
    -- Tên placeholder trong template HTML, ví dụ: {{greeting}}
    placeholder_key  VARCHAR(100) NOT NULL,
    -- Ưu tiên kiểm tra: số nhỏ hơn = kiểm tra trước
    priority         INT DEFAULT 0,
    -- Điều kiện kích hoạt (JSON). Ví dụ:
    -- {"field":"city","op":"eq","value":"HCM"}
    -- {"field":"open_count","op":"gte","value":3}
    -- {"field":"language","op":"eq","value":"en"}
    -- Toán tử hỗ trợ: eq, neq, gt, gte, lt, lte, contains, in, not_in
    condition        JSONB NOT NULL DEFAULT '{}',
    content_html     TEXT NOT NULL,    -- Nội dung thay thế nếu điều kiện đúng
    fallback_html    TEXT,             -- Nội dung mặc định nếu không rule nào khớp
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP
);

CREATE INDEX idx_personalization_template    ON personalization_rules(template_id);
CREATE INDEX idx_personalization_placeholder ON personalization_rules(placeholder_key);


-- =========================================
-- 9. CAMPAIGNS — Chiến dịch gửi email hàng loạt
-- =========================================

CREATE TABLE campaigns (
    id               SERIAL PRIMARY KEY,
    user_id          INT REFERENCES users(id) ON DELETE CASCADE,
    campaign_name    VARCHAR(200) NOT NULL,
    template_id      INT REFERENCES email_templates(id),
    email_account_id INT REFERENCES email_accounts(id),
    segment_id       INT REFERENCES contact_segments(id),
    -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
    status           VARCHAR(50) DEFAULT 'draft',
    -- 'regular', 'ab_test', 'automated'
    campaign_type    VARCHAR(50) DEFAULT 'regular',
    scheduled_time   TIMESTAMP,
    started_at       TIMESTAMP,
    completed_at     TIMESTAMP,
    -- Thống kê tổng hợp (cập nhật realtime)
    total_recipients INT DEFAULT 0,
    sent_count       INT DEFAULT 0,
    open_count       INT DEFAULT 0,
    click_count      INT DEFAULT 0,
    bounce_count     INT DEFAULT 0,
    unsubscribe_count INT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP
);

CREATE INDEX idx_campaigns_user   ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);


-- =========================================
-- 10. CAMPAIGN RECIPIENTS — Người nhận trong chiến dịch
-- =========================================

CREATE TABLE campaign_recipients (
    id          SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id  INT REFERENCES email_contacts(id),
    email       VARCHAR(150) NOT NULL,
    -- 'pending', 'sent', 'failed', 'bounced', 'unsubscribed'
    status      VARCHAR(50) DEFAULT 'pending',
    -- Nội dung email đã render xong (sau khi áp dụng personalization)
    rendered_subject  VARCHAR(255),
    rendered_html     TEXT,
    sent_time         TIMESTAMP,
    open_time         TIMESTAMP,
    click_time        TIMESTAMP,
    open_count        INT DEFAULT 0,
    click_count       INT DEFAULT 0,
    error_message     TEXT
);

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_contact  ON campaign_recipients(contact_id);
CREATE INDEX idx_campaign_recipients_status   ON campaign_recipients(status);


-- =========================================
-- 11. EMAIL TRACKING — Sự kiện theo dõi chi tiết
-- =========================================

CREATE TABLE email_tracking (
    id                   SERIAL PRIMARY KEY,
    campaign_recipient_id INT REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    -- 'open', 'click', 'unsubscribe', 'bounce', 'spam_complaint'
    event_type           VARCHAR(50) NOT NULL,
    -- URL được click (nếu event_type = 'click')
    clicked_url          TEXT,
    ip_address           VARCHAR(50),
    user_agent           TEXT,
    event_time           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_recipient ON email_tracking(campaign_recipient_id);
CREATE INDEX idx_tracking_event     ON email_tracking(event_type);


-- =========================================
-- 12. UNSUBSCRIBES — Quản lý hủy đăng ký
-- =========================================

CREATE TABLE unsubscribes (
    id               SERIAL PRIMARY KEY,
    user_id          INT REFERENCES users(id) ON DELETE CASCADE,
    contact_id       INT REFERENCES email_contacts(id) ON DELETE SET NULL,
    email            VARCHAR(150) NOT NULL,
    -- 'user_request', 'spam_complaint', 'admin', 'bounce'
    reason           VARCHAR(50) DEFAULT 'user_request',
    campaign_id      INT REFERENCES campaigns(id) ON DELETE SET NULL,
    ip_address       VARCHAR(50),
    unsubscribed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

CREATE INDEX idx_unsubscribes_email ON unsubscribes(email);


-- =========================================
-- 13. EMAIL BOUNCES — Xử lý email bị trả lại
-- =========================================

CREATE TABLE email_bounces (
    id                SERIAL PRIMARY KEY,
    user_id           INT REFERENCES users(id) ON DELETE CASCADE,
    contact_id        INT REFERENCES email_contacts(id) ON DELETE SET NULL,
    campaign_id       INT REFERENCES campaigns(id) ON DELETE SET NULL,
    email             VARCHAR(150) NOT NULL,
    -- 'hard': địa chỉ không tồn tại => ngừng gửi vĩnh viễn
    -- 'soft': hộp thư đầy, server lỗi tạm thời => thử lại sau
    bounce_type       VARCHAR(20) NOT NULL CHECK (bounce_type IN ('hard', 'soft')),
    bounce_code       VARCHAR(20),      -- Mã SMTP, ví dụ: 550, 421
    bounce_message    TEXT,
    soft_bounce_count INT DEFAULT 1,    -- >= 3 lần soft => treat như hard bounce
    bounced_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bounces_email ON email_bounces(email);
CREATE INDEX idx_bounces_type  ON email_bounces(bounce_type);


-- =========================================
-- 14. AB TEST VARIANTS — Thử nghiệm A/B
-- =========================================

CREATE TABLE ab_test_variants (
    id                  SERIAL PRIMARY KEY,
    campaign_id         INT REFERENCES campaigns(id) ON DELETE CASCADE,
    variant_name        VARCHAR(50) NOT NULL,   -- 'A', 'B', 'Control'
    template_id         INT REFERENCES email_templates(id),
    subject_override    VARCHAR(255),            -- Subject riêng cho variant này
    traffic_percentage  INT DEFAULT 50 CHECK (traffic_percentage BETWEEN 1 AND 100),
    -- Thống kê theo variant
    sent_count          INT DEFAULT 0,
    open_count          INT DEFAULT 0,
    click_count         INT DEFAULT 0,
    unsubscribe_count   INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gán recipient vào variant
CREATE TABLE ab_test_assignments (
    id                    SERIAL PRIMARY KEY,
    campaign_recipient_id INT REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    variant_id            INT REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    assigned_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_recipient_id)
);

CREATE INDEX idx_ab_assignments_variant ON ab_test_assignments(variant_id);


-- =========================================
-- 15. AUTOMATION FLOWS — Luồng email tự động
-- =========================================

CREATE TABLE automation_flows (
    id                SERIAL PRIMARY KEY,
    user_id           INT REFERENCES users(id) ON DELETE CASCADE,
    flow_name         VARCHAR(150) NOT NULL,
    description       TEXT,
    -- Sự kiện kích hoạt:
    -- 'contact_created', 'tag_added', 'email_opened', 'link_clicked',
    -- 'date_anniversary', 'segment_entered', 'custom'
    trigger_event     VARCHAR(100) NOT NULL,
    -- Điều kiện bổ sung kèm trigger (JSON)
    trigger_condition JSONB DEFAULT '{}',
    is_active         BOOLEAN DEFAULT TRUE,
    run_count         INT DEFAULT 0,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP
);

-- Các bước trong automation flow
CREATE TABLE automation_steps (
    id          SERIAL PRIMARY KEY,
    flow_id     INT REFERENCES automation_flows(id) ON DELETE CASCADE,
    step_order  INT NOT NULL,
    -- 'send_email', 'wait', 'condition', 'add_tag', 'remove_tag', 'update_field'
    step_type   VARCHAR(50) NOT NULL,
    -- Cấu hình JSON theo từng loại bước:
    -- send_email:    {"template_id": 1, "email_account_id": 1}
    -- wait:          {"duration": 3600, "unit": "seconds"}
    -- condition:     {"field": "open_count", "op": "gte", "value": 1,
    --                 "true_next_step": 3, "false_next_step": 4}
    -- add_tag:       {"tag_id": 5}
    -- update_field:  {"field_id": 2, "value": "VIP"}
    step_config JSONB DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log thực thi automation cho từng contact
CREATE TABLE automation_logs (
    id            SERIAL PRIMARY KEY,
    flow_id       INT REFERENCES automation_flows(id) ON DELETE CASCADE,
    step_id       INT REFERENCES automation_steps(id) ON DELETE SET NULL,
    contact_id    INT REFERENCES email_contacts(id) ON DELETE CASCADE,
    -- 'pending', 'running', 'completed', 'failed', 'skipped'
    status        VARCHAR(50) DEFAULT 'pending',
    scheduled_at  TIMESTAMP,
    executed_at   TIMESTAMP,
    error_message TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automation_logs_flow    ON automation_logs(flow_id);
CREATE INDEX idx_automation_logs_contact ON automation_logs(contact_id);
CREATE INDEX idx_automation_logs_status  ON automation_logs(status);


-- =========================================
-- 16. INDIVIDUAL EMAILS — Email gửi riêng lẻ
-- =========================================

CREATE TABLE individual_emails (
    id               SERIAL PRIMARY KEY,
    user_id          INT REFERENCES users(id) ON DELETE CASCADE,
    contact_id       INT REFERENCES email_contacts(id),
    email_account_id INT REFERENCES email_accounts(id),
    subject          VARCHAR(255),
    content_html     TEXT,
    content_text     TEXT,
    -- 'draft', 'sent', 'failed'
    status           VARCHAR(50) DEFAULT 'draft',
    sent_time        TIMESTAMP,
    open_time        TIMESTAMP,
    error_message    TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 17. EMAIL LOGS — Nhật ký gửi tổng hợp
-- =========================================

CREATE TABLE email_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    campaign_id INT REFERENCES campaigns(id),
    contact_id  INT REFERENCES email_contacts(id),
    email       VARCHAR(150),
    -- 'sent', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed'
    status      VARCHAR(50),
    message     TEXT,
    sent_time   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX idx_email_logs_status   ON email_logs(status);


-- =========================================
-- DỮ LIỆU MẪU
-- =========================================

-- User admin mặc định
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@email.com', '$2b$10$placeholder_hash_here', 'admin');

-- Tài khoản SMTP mẫu
INSERT INTO email_accounts (user_id, email_address, display_name, smtp_host, smtp_port, smtp_username, smtp_password, use_tls, is_default, status) VALUES
(1, 'noreply@yourdomain.com', 'ChadMailer', 'smtp.gmail.com', 587, 'noreply@yourdomain.com', 'your_app_password', TRUE, TRUE, 'active');

-- Template mẫu với placeholder cá nhân hóa
INSERT INTO email_templates (user_id, template_name, subject, preview_text, content_html, version, is_active) VALUES
(1,
 'Welcome Email',
 'Chào mừng {{first_name}} đến với chúng tôi!',
 'Cảm ơn bạn đã đăng ký...',
 '<html><body>
  <p>{{greeting}}</p>
  <p>Xin chào <strong>{{first_name}}</strong>,</p>
  <p>Cảm ơn bạn đã đăng ký nhận tin từ chúng tôi.</p>
  <p>{{promo_block}}</p>
  <p>Trân trọng,<br>Đội ngũ ChadMailer</p>
  <p style="font-size:11px;color:#999;">
    <a href="{{unsubscribe_url}}">Hủy đăng ký</a>
  </p>
 </body></html>',
 1, TRUE);

-- Quy tắc cá nhân hóa mẫu
INSERT INTO personalization_rules (user_id, template_id, rule_name, placeholder_key, priority, condition, content_html, fallback_html) VALUES
(1, 1, 'Lời chào theo thành phố - HCM', '{{greeting}}', 1,
 '{"field":"city","op":"eq","value":"HCM"}',
 '<p>Xin chào quý khách tại TP. Hồ Chí Minh! 🌆</p>',
 '<p>Xin chào quý khách!</p>'),

(1, 1, 'Lời chào theo thành phố - HN', '{{greeting}}', 2,
 '{"field":"city","op":"eq","value":"HN"}',
 '<p>Xin chào quý khách tại Hà Nội! 🏛️</p>',
 '<p>Xin chào quý khách!</p>'),

(1, 1, 'Khuyến mãi VIP', '{{promo_block}}', 1,
 '{"field":"tag","op":"contains","value":"VIP"}',
 '<div style="background:#fff3cd;padding:12px;border-radius:6px;">
    <strong>🎁 Ưu đãi đặc biệt dành cho khách VIP: Giảm 30% đơn hàng tiếp theo!</strong>
  </div>',
 '<p>Khám phá các ưu đãi mới nhất tại website của chúng tôi.</p>');

-- Phân khúc mẫu
INSERT INTO contact_segments (user_id, segment_name, description, conditions, is_dynamic) VALUES
(1, 'Khách hàng HCM đang hoạt động',
 'Contact tại HCM với email_status = active',
 '{"operator":"AND","conditions":[{"field":"city","op":"eq","value":"HCM"},{"field":"email_status","op":"eq","value":"active"}]}',
 TRUE),

(1, 'Khách hàng đã mở email gần đây',
 'Contact có open_count >= 1 trong 30 ngày qua',
 '{"operator":"AND","conditions":[{"field":"open_count","op":"gte","value":1},{"field":"last_open_days","op":"lte","value":30}]}',
 TRUE);

-- Automation flow mẫu: Welcome series
INSERT INTO automation_flows (user_id, flow_name, description, trigger_event, trigger_condition, is_active) VALUES
(1, 'Welcome Series', 'Gửi email chào mừng khi có contact mới', 'contact_created', '{}', TRUE);

INSERT INTO automation_steps (flow_id, step_order, step_type, step_config) VALUES
(1, 1, 'send_email',  '{"template_id": 1, "email_account_id": 1}'),
(1, 2, 'wait',        '{"duration": 86400, "unit": "seconds"}'),
(1, 3, 'condition',   '{"field":"open_count","op":"gte","value":1,"true_next_step":4,"false_next_step":5}'),
(1, 4, 'add_tag',     '{"tag_name": "Engaged"}'),
(1, 5, 'send_email',  '{"template_id": 1, "email_account_id": 1}');

-- Dynamic field mẫu
INSERT INTO dynamic_fields (user_id, field_name, field_label, field_type) VALUES
(1, 'birthday',       'Ngày sinh',       'date'),
(1, 'customer_type',  'Loại khách hàng', 'text'),
(1, 'total_orders',   'Tổng đơn hàng',   'number'),
(1, 'last_purchase',  'Lần mua cuối',    'date');

-- Contact mẫu
INSERT INTO email_contacts (user_id, email, first_name, last_name, company, city, country, language, email_status, source) VALUES
(1, 'nguyen.van.a@gmail.com', 'An',    'Nguyễn', 'Công ty ABC', 'HCM', 'VN', 'vi', 'active', 'manual'),
(1, 'tran.thi.b@gmail.com',   'Bình',  'Trần',   'Công ty XYZ', 'HN',  'VN', 'vi', 'active', 'import'),
(1, 'john.doe@example.com',   'John',  'Doe',    'Acme Corp',   NULL,  'US', 'en', 'active', 'form');

-- Tag mẫu
INSERT INTO contact_tags (user_id, tag_name, color) VALUES
(1, 'VIP',       '#f59e0b'),
(1, 'Newsletter','#3b82f6'),
(1, 'Khách mới', '#10b981');

-- Gán tag cho contact
INSERT INTO contact_tag_map (contact_id, tag_id) VALUES
(1, 1), -- An = VIP
(1, 2), -- An = Newsletter
(2, 2), -- Bình = Newsletter
(3, 3); -- John = Khách mới
