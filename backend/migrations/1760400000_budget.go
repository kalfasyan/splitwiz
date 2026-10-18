package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Adds the household's shared monthly budget: a single record both
// partners can change, shown on the Stats tab. 0 means no budget.
func init() {
	m.Register(func(app core.App) error {
		budget := core.NewBaseCollection("budget")
		setMemberRules(budget)
		// there is only ever the one record created here
		budget.CreateRule = nil
		budget.DeleteRule = nil
		budget.Fields.Add(
			&core.NumberField{Name: "monthly_cents", OnlyInt: true, Min: types.Pointer(0.0)},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		if err := app.Save(budget); err != nil {
			return err
		}
		r := core.NewRecord(budget)
		r.Set("monthly_cents", 0)
		return app.Save(r)
	}, func(app core.App) error {
		if c, err := app.FindCollectionByNameOrId("budget"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
