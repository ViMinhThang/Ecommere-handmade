-- Add verified artisan profile fields to seller users.
ALTER TABLE "User"
ADD COLUMN "artisanVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "craftSpecialty" TEXT,
ADD COLUMN "craftExperienceYears" INTEGER,
ADD COLUMN "craftMaterials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "verificationNote" TEXT;
