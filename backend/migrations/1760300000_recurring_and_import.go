package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Adds recurring expenses and the import_ref marker that makes Splitwise
// imports safe to run twice.
func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		categories, err := app.FindCollectionByNameOrId("categories")
		if err != nil {
			return err
		}

		recurring := core.NewBaseCollection("recurring_expenses")
		setMemberRules(recurring)
		recurring.Fields.Add(
			&core.TextField{Name: "description", Required: true, Max: 200},
			&core.NumberField{Name: "amount_cents", Required: true, OnlyInt: true, Min: types.Pointer(1.0)},
			&core.RelationField{Name: "paid_by", Required: true, MaxSelect: 1, CollectionId: users.Id},
			&core.SelectField{Name: "split_mode", Required: true, MaxSelect: 1, Values: []string{"equal", "percent", "exact", "full"}},
			&core.NumberField{Name: "payer_percent", Min: types.Pointer(0.0), Max: types.Pointer(100.0)},
			&core.NumberField{Name: "other_share_cents", OnlyInt: true, Min: types.Pointer(0.0)},
			&core.NumberField{Name: "owed_cents", OnlyInt: true},
			&core.RelationField{Name: "category", MaxSelect: 1, CollectionId: categories.Id},
			&core.TextField{Name: "note", Max: 1000},
			&core.SelectField{Name: "every", Required: true, MaxSelect: 1, Values: []string{"week", "month", "year"}},
			// the next day an expense will be added; the server moves it forward
			&core.DateField{Name: "next_date", Required: true},
			// day of the month monthly/yearly series stay on, set by the server
			&core.NumberField{Name: "anchor_day", OnlyInt: true},
			&core.BoolField{Name: "paused"},
			&core.RelationField{Name: "created_by", MaxSelect: 1, CollectionId: users.Id},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		recurring.AddIndex("idx_recurring_next", false, "next_date", "")
		if err := app.Save(recurring); err != nil {
			return err
		}

		expenses, err := app.FindCollectionByNameOrId("expenses")
		if err != nil {
			return err
		}
		expenses.Fields.Add(
			&core.RelationField{Name: "recurring", MaxSelect: 1, CollectionId: recurring.Id},
			&core.TextField{Name: "import_ref", Max: 64},
		)
		expenses.AddIndex("idx_expenses_import_ref", false, "import_ref", "")
		if err := app.Save(expenses); err != nil {
			return err
		}

		settlements, err := app.FindCollectionByNameOrId("settlements")
		if err != nil {
			return err
		}
		settlements.Fields.Add(&core.TextField{Name: "import_ref", Max: 64})
		settlements.AddIndex("idx_settlements_import_ref", false, "import_ref", "")
		return app.Save(settlements)
	}, func(app core.App) error {
		for _, name := range []string{"expenses", "settlements"} {
			c, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				continue
			}
			c.Fields.RemoveByName("recurring")
			c.Fields.RemoveByName("import_ref")
			c.RemoveIndex("idx_" + name + "_import_ref")
			if err := app.Save(c); err != nil {
				return err
			}
		}
		if c, err := app.FindCollectionByNameOrId("recurring_expenses"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
