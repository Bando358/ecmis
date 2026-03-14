-- Conversion obstAnemie, obstSyphilis, obstAghbs: Boolean → String
-- true  → 'Positif'
-- false → 'Non'

ALTER TABLE "Obstetrique"
  ALTER COLUMN "obstAnemie" TYPE TEXT
    USING CASE WHEN "obstAnemie" THEN 'Positif' ELSE 'Non' END,
  ALTER COLUMN "obstSyphilis" TYPE TEXT
    USING CASE WHEN "obstSyphilis" THEN 'Positif' ELSE 'Non' END,
  ALTER COLUMN "obstAghbs" TYPE TEXT
    USING CASE WHEN "obstAghbs" THEN 'Positif' ELSE 'Non' END;

ALTER TABLE "Obstetrique"
  ALTER COLUMN "obstAnemie" SET DEFAULT 'Non',
  ALTER COLUMN "obstSyphilis" SET DEFAULT 'Non',
  ALTER COLUMN "obstAghbs" SET DEFAULT 'Non';
