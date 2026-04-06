-- Insert test dataset for Debt Smart OS
-- This includes all clients mentioned in the requirements

-- Get user IDs (assuming they exist from setup_db.sql)
-- Adel (admin), Loay (supervisor), Mostafa (team_leader), Heba (team_leader), Nora (collector)

-- Insert EYAD (3 loans merged)
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'EYAD', 'CUST001', 'eyad@example.com', 'Tech Corp', 'High priority client', id, 'ACTIVE', 'FIRST', 'Cairo', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'admin' LIMIT 1;

-- Get EYAD's ID for inserting related data
WITH eyad_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST001' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201001234567' FROM eyad_client
UNION ALL
SELECT id, '201101234567' FROM eyad_client;

-- Insert EYAD's addresses
WITH eyad_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST001' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '123 Main St', 'Cairo', 'Downtown', 30.0444, 31.2357, true FROM eyad_client
UNION ALL
SELECT id, '456 Secondary St', 'Cairo', 'Heliopolis', 30.0619, 31.2716, false FROM eyad_client;

-- Insert EYAD's loans (3 merged loans)
WITH eyad_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST001' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Personal Loan', 5000, 45000, 15000, 3, true, 2000, 20000 FROM eyad_client
UNION ALL
SELECT id, 'Auto Loan', 3000, 28000, 9000, 2, false, 0, 12000 FROM eyad_client
UNION ALL
SELECT id, 'Credit Card', 2000, 18000, 6000, 2, true, 1000, 7000 FROM eyad_client;

-- Insert EMAD
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'EMAD', 'CUST002', 'emad@example.com', 'Finance Ltd', 'Medium priority', id, 'ACTIVE', 'FIRST', 'Alexandria', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'admin' LIMIT 1;

WITH emad_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST002' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201201234567' FROM emad_client;

WITH emad_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST002' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '789 Business Ave', 'Alexandria', 'Montaza', 31.2801, 29.9187, true FROM emad_client;

WITH emad_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST002' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Personal Loan', 4000, 32000, 8000, 2, false, 0, 8000 FROM emad_client;

-- Insert MOHAMED IBRAHIM
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'MOHAMED IBRAHIM', 'CUST003', 'mibrahim@example.com', 'Retail Co', 'Regular client', id, 'ACTIVE', 'THIRD', 'Giza', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '1 month'
FROM users WHERE role = 'collector' LIMIT 1;

WITH mi_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST003' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201301234567' FROM mi_client;

WITH mi_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST003' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '321 Retail St', 'Giza', 'Dokki', 30.0131, 31.2089, true FROM mi_client;

WITH mi_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST003' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Business Loan', 6000, 50000, 5000, 1, false, 0, 5000 FROM mi_client;

-- Insert AMR
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'AMR', 'CUST004', 'amr@example.com', 'Manufacturing Inc', 'High risk', id, 'WRITEOFF', 'WRITEOFF', 'Suez', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE
FROM users WHERE role = 'supervisor' LIMIT 1;

WITH amr_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST004' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201401234567' FROM amr_client;

WITH amr_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST004' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '654 Industrial Rd', 'Suez', 'Port Area', 29.9668, 32.5498, true FROM amr_client;

WITH amr_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST004' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Corporate Loan', 10000, 85000, 40000, 4, true, 5000, 45000 FROM amr_client;

-- Insert RANIA
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'RANIA', 'CUST005', 'rania@example.com', 'Fashion Boutique', 'VIP client', id, 'ACTIVE', 'FIRST', 'Cairo', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'admin' LIMIT 1;

WITH rania_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST005' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201501234567' FROM rania_client;

WITH rania_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST005' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '987 Fashion Plaza', 'Cairo', 'Zamalek', 30.0626, 31.2653, true FROM rania_client;

WITH rania_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST005' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Personal Loan', 2000, 15000, 0, 0, false, 0, 0 FROM rania_client;

-- Insert NERMINE
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'NERMINE', 'CUST006', 'nermine@example.com', 'Healthcare Services', 'Regular', id, 'ACTIVE', 'FIRST', 'Alexandria', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'team_leader' LIMIT 1;

WITH nermine_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST006' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201601234567' FROM nermine_client;

WITH nermine_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST006' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '111 Medical Center', 'Alexandria', 'Sidi Bishr', 31.2119, 29.9187, true FROM nermine_client;

WITH nermine_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST006' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Personal Loan', 3500, 28000, 7000, 2, false, 0, 7000 FROM nermine_client;

-- Insert DINA
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'DINA', 'CUST007', 'dina@example.com', 'Education Institute', 'Cooperative', id, 'ACTIVE', 'THIRD', 'Giza', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '1 month'
FROM users WHERE role = 'collector' LIMIT 1;

WITH dina_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST007' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201701234567' FROM dina_client;

WITH dina_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST007' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '222 School Road', 'Giza', 'Mohandessin', 30.0344, 31.2089, true FROM dina_client;

WITH dina_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST007' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Education Loan', 2500, 20000, 2000, 1, false, 0, 2000 FROM dina_client;

-- Insert RADWAN
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'RADWAN', 'CUST008', 'radwan@example.com', 'Construction Co', 'Medium risk', id, 'WRITEOFF', 'WRITEOFF', 'Cairo', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '30 days'
FROM users WHERE role = 'supervisor' LIMIT 1;

WITH radwan_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST008' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201801234567' FROM radwan_client;

WITH radwan_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST008' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '333 Construction Blvd', 'Cairo', 'New Cairo', 30.0131, 31.4867, true FROM radwan_client;

WITH radwan_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST008' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Corporate Loan', 8000, 65000, 25000, 3, true, 3000, 28000 FROM radwan_client;

-- Insert SHERIF
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'SHERIF', 'CUST009', 'sherif@example.com', 'IT Solutions', 'Delaying', id, 'ACTIVE', 'FIRST', 'Cairo', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'team_leader' LIMIT 1;

WITH sherif_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST009' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '201901234567' FROM sherif_client;

WITH sherif_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST009' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '444 Tech Park', 'Cairo', 'Smart Village', 30.0131, 31.4867, true FROM sherif_client;

WITH sherif_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST009' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Personal Loan', 4500, 36000, 12000, 2, true, 1500, 13500 FROM sherif_client;

-- Insert SANDRA (VIP)
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'SANDRA', 'CUST010', 'sandra@example.com', 'Luxury Goods', 'VIP - Cooperative', id, 'ACTIVE', 'FIRST', 'Cairo', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'admin' LIMIT 1;

WITH sandra_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST010' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202001234567' FROM sandra_client;

WITH sandra_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST010' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '555 Luxury Ave', 'Cairo', 'Heliopolis', 30.0619, 31.2716, true FROM sandra_client;

WITH sandra_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST010' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Premium Loan', 7000, 55000, 0, 0, false, 0, 0 FROM sandra_client;

-- Insert ALY
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'ALY', 'CUST011', 'aly@example.com', 'Trading Company', 'Avoiding', id, 'WRITEOFF', 'WRITEOFF', 'Alexandria', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE
FROM users WHERE role = 'supervisor' LIMIT 1;

WITH aly_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST011' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202101234567' FROM aly_client;

WITH aly_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST011' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '666 Trade Center', 'Alexandria', 'Sidi Bishr', 31.2119, 29.9187, true FROM aly_client;

WITH aly_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST011' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Business Loan', 9000, 72000, 35000, 4, true, 4000, 39000 FROM aly_client;

-- Insert AHMED FATHY
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'AHMED FATHY', 'CUST012', 'afathy@example.com', 'Engineering Firm', 'Regular', id, 'ACTIVE', 'FIRST', 'Giza', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'collector' LIMIT 1;

WITH af_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST012' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202201234567' FROM af_client;

WITH af_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST012' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '777 Engineering Blvd', 'Giza', '6th of October', 30.0131, 31.2089, true FROM af_client;

WITH af_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST012' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Corporate Loan', 5500, 44000, 8000, 1, false, 0, 8000 FROM af_client;

-- Insert HESHAM
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'HESHAM', 'CUST013', 'hesham@example.com', 'Logistics Ltd', 'High priority', id, 'ACTIVE', 'THIRD', 'Cairo', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '1 month'
FROM users WHERE role = 'team_leader' LIMIT 1;

WITH hesham_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST013' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202301234567' FROM hesham_client;

WITH hesham_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST013' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '888 Logistics Park', 'Cairo', 'Nasr City', 30.0619, 31.2716, true FROM hesham_client;

WITH hesham_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST013' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Business Loan', 6500, 52000, 18000, 3, true, 2000, 20000 FROM hesham_client;

-- Insert AHMED GAMAL
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'AHMED GAMAL', 'CUST014', 'agamal@example.com', 'Media Company', 'Cooperative', id, 'ACTIVE', 'FIRST', 'Cairo', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'admin' LIMIT 1;

WITH ag_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST014' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202401234567' FROM ag_client;

WITH ag_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST014' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '999 Media Tower', 'Cairo', 'Downtown', 30.0444, 31.2357, true FROM ag_client;

WITH ag_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST014' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Personal Loan', 3000, 24000, 3000, 1, false, 0, 3000 FROM ag_client;

-- Insert MOSTAFA (HIGH RISK)
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'MOSTAFA', 'CUST015', 'mostafa@example.com', 'Import/Export', 'CRITICAL - High Risk', id, 'WRITEOFF', 'WRITEOFF', 'Suez', CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE
FROM users WHERE role = 'supervisor' LIMIT 1;

WITH mostafa_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST015' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202501234567' FROM mostafa_client;

WITH mostafa_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST015' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '1010 Port Rd', 'Suez', 'Port Area', 29.9668, 32.5498, true FROM mostafa_client;

WITH mostafa_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST015' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Corporate Loan', 12000, 95000, 50000, 4, true, 6000, 56000 FROM mostafa_client;

-- Insert AHMED MOBARAK
INSERT INTO clients (name, customer_id, email, company, notes, owner_id, portfolio_type, domain_type, branch, cycle_start_date, cycle_end_date)
SELECT 'AHMED MOBARAK', 'CUST016', 'amobarak@example.com', 'Real Estate', 'Regular', id, 'ACTIVE', 'FIRST', 'Cairo', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months'
FROM users WHERE role = 'collector' LIMIT 1;

WITH am_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST016' LIMIT 1
)
INSERT INTO client_phones (client_id, phone)
SELECT id, '202601234567' FROM am_client;

WITH am_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST016' LIMIT 1
)
INSERT INTO client_addresses (client_id, address, city, area, lat, lng, is_primary)
SELECT id, '1111 Real Estate Blvd', 'Cairo', 'New Cairo', 30.0131, 31.4867, true FROM am_client;

WITH am_client AS (
  SELECT id FROM clients WHERE customer_id = 'CUST016' LIMIT 1
)
INSERT INTO client_loans (client_id, loan_type, emi, balance, overdue, bucket, penalty_enabled, penalty_amount, amount_due)
SELECT id, 'Mortgage', 8500, 68000, 12000, 2, false, 0, 12000 FROM am_client;
