package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Adds an optional monthly limit to each category, and a marker so its
// "close to the limit" alert is sent once a month.
func init() {
	m.Register(func(app core.App) error {
		categories, err := app.FindCollectionByNameOrId("categories")
		if err != nil {
			return err
		}
		// 0 means no limit
		categories.Fields.Add(&core.NumberField{Name: "monthly_cents", OnlyInt: true, Min: types.Pointer(0.0)})
		// YYYY-MM of the last alert for this category
		categories.Fields.Add(&core.TextField{Name: "alerted_month", Max: 7, Hidden: true})
		return app.Save(categories)
	}, func(app core.App) error {
		categories, err := app.FindCollectionByNameOrId("categories")
		if err != nil {
			return err
		}
		categories.Fields.RemoveByName("monthly_cents")
		categories.Fields.RemoveByName("alerted_month")
		return app.Save(categories)
	})
}
