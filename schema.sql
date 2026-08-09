-- ==========================================
-- 🩺 PATIENT PROFILE DATABASE SCHEMA
-- MedAI preventive healthcare platform
-- ==========================================

-- 1. Create the patient_profile table
CREATE TABLE IF NOT EXISTS public.patient_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    age INTEGER,
    height NUMERIC NOT NULL,
    weight NUMERIC NOT NULL,
    -- BMI is automatically calculated as: weight / (height_in_meters)^2
    bmi NUMERIC GENERATED ALWAYS AS (ROUND((weight / ((height / 100.0) * (height / 100.0)))::numeric, 2)) STORED,
    athlete_status BOOLEAN NOT NULL DEFAULT FALSE,
    sport_type TEXT,
    training_frequency TEXT,
    resting_heart_rate INTEGER,
    medical_history TEXT[] DEFAULT '{}'::text[],
    smoking BOOLEAN NOT NULL DEFAULT FALSE,
    alcohol BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.patient_profile ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies
-- Allow authenticated users to view profiles (so doctors can check patient profiles if needed)
CREATE POLICY "Users can view profiles" 
ON public.patient_profile 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.patient_profile 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.patient_profile 
FOR UPDATE 
USING (auth.uid() = id);

-- 4. Automatically update the updated_at column on changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON public.patient_profile
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
