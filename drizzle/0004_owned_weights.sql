-- The Bowflex now has a weights page like the other fixed gear, so its kg | lb toggle goes away.
-- Anyone with the Bowflex already on and no weights gets the standard 210 lb of Power Rods ticked: 5 to 105 lb per side, every 5.
INSERT INTO "equipment_weight" ("user_id", "equipment", "weight", "unit")
SELECT ue."user_id", 'bowflex xtreme 2 se', g::real, 'lb'
FROM "user_equipment" ue
CROSS JOIN generate_series(5, 105, 5) AS g
WHERE ue."equipment" = 'bowflex xtreme 2 se'
  AND NOT EXISTS (SELECT 1 FROM "equipment_weight" w WHERE w."user_id" = ue."user_id" AND w."equipment" = 'bowflex xtreme 2 se')
ON CONFLICT DO NOTHING;--> statement-breakpoint
DROP TABLE "equipment_unit" CASCADE;
