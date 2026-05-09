-- Part 0: Auth hotfix

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'collector';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_super_user boolean DEFAULT false;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


-- Part 0.5: Client referral

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS referral text;


-- Part 1: Loan fields

ALTER TABLE public.client_loans 
ADD COLUMN IF NOT EXISTS loan_number text;

ALTER TABLE public.client_loans 
ADD COLUMN IF NOT EXISTS cycle integer;

ALTER TABLE public.client_loans 
ADD COLUMN IF NOT EXISTS organization text;

ALTER TABLE public.client_loans 
ADD COLUMN IF NOT EXISTS will_legal boolean DEFAULT false;

ALTER TABLE public.client_loans 
ADD COLUMN IF NOT EXISTS referral_date timestamptz;

ALTER TABLE public.client_loans 
ADD COLUMN IF NOT EXISTS collector_percentage numeric(6,2);


-- Part 2: Indexes

CREATE INDEX IF NOT EXISTS idx_client_loans_loan_number 
ON public.client_loans(loan_number);

CREATE INDEX IF NOT EXISTS idx_client_loans_referral_date 
ON public.client_loans(referral_date);

CREATE INDEX IF NOT EXISTS idx_client_loans_organization 
ON public.client_loans(organization);


-- Part 3: Fix old data

UPDATE public.client_loans
SET will_legal = COALESCE(will_legal, false)
WHERE will_legal IS NULL;

UPDATE public.client_loans
SET amount_due = COALESCE(amount_due, overdue, 0)
WHERE amount_due IS NULL;