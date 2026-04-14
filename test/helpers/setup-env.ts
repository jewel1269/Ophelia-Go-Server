// Inject test secrets before any module is loaded
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars-minimum';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-minimum';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test-pass';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.NODE_ENV = 'test';
