-- Add penalty_type setting to system_settings table
-- This setting defines how penalties are calculated (per day or per hour)

INSERT INTO system_settings (
    setting_key, 
    setting_value, 
    setting_type, 
    description, 
    created_at, 
    updated_at
)
VALUES (
    'penalty_type',
    'day',
    'string',
    'ประเภทการคำนวณค่าปรับ: day (รายวัน) หรือ hour (รายชั่วโมง)',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE 
    description = 'ประเภทการคำนวณค่าปรับ: day (รายวัน) หรือ hour (รายชั่วโมง)',
    updated_at = NOW();
