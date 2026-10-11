package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Only signed-in members of the "users" collection may touch app data.
const memberRule = "@request.auth.id != '' && @request.auth.collectionName = 'users'"

var defaultCategories = []struct{ name, emoji string }{
	{"Groceries", "🛒"},
	{"Restaurants", "🍽️"},
	{"Rent", "🏠"},
	{"Utilities", "💡"},
	{"Transport", "🚗"},
	{"Travel", "✈️"},
	{"Entertainment", "🎬"},
	{"Health", "💊"},
	{"Shopping", "🛍️"},
	{"Other", "📦"},
}

func init() {
	m.Register(func(app core.App) error {
		// users: both partners can see each other, nobody can sign up
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.ListRule = types.Pointer(memberRule)
		users.ViewRule = types.Pointer(memberRule)
		users.CreateRule = nil
		users.DeleteRule = nil
		if err := app.Save(users); err != nil {
			return err
		}

		categories := core.NewBaseCollection("categories")
		setMemberRules(categories)
		categories.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 50},
			&core.TextField{Name: "emoji", Max: 16},
			&core.NumberField{Name: "sort", OnlyInt: true},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		categories.AddIndex("idx_categories_name", true, "name", "")
		if err := app.Save(categories); err != nil {
			return err
		}

		for i, c := range defaultCategories {
			r := core.NewRecord(categories)
			r.Set("name", c.name)
			r.Set("emoji", c.emoji)
			r.Set("sort", i)
			if err := app.Save(r); err != nil {
				return err
			}
		}

		expenses := core.NewBaseCollection("expenses")
		setMemberRules(expenses)
		expenses.Fields.Add(
			&core.TextField{Name: "description", Required: true, Max: 200},
			&core.NumberField{Name: "amount_cents", Required: true, OnlyInt: true, Min: types.Pointer(1.0)},
			&core.RelationField{Name: "paid_by", Required: true, MaxSelect: 1, CollectionId: users.Id},
			&core.SelectField{Name: "split_mode", Required: true, MaxSelect: 1, Values: []string{"equal", "percent", "exact", "full"}},
			&core.NumberField{Name: "payer_percent", Min: types.Pointer(0.0), Max: types.Pointer(100.0)},
			&core.NumberField{Name: "other_share_cents", OnlyInt: true, Min: types.Pointer(0.0)},
			// computed on every save by the server, see hooks.go
			&core.NumberField{Name: "owed_cents", OnlyInt: true},
			&core.RelationField{Name: "category", MaxSelect: 1, CollectionId: categories.Id},
			&core.DateField{Name: "date", Required: true},
			&core.TextField{Name: "note", Max: 1000},
			&core.RelationField{Name: "created_by", MaxSelect: 1, CollectionId: users.Id},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		expenses.AddIndex("idx_expenses_date", false, "date", "")
		if err := app.Save(expenses); err != nil {
			return err
		}

		settlements := core.NewBaseCollection("settlements")
		setMemberRules(settlements)
		settlements.Fields.Add(
			&core.RelationField{Name: "from_user", Required: true, MaxSelect: 1, CollectionId: users.Id},
			&core.RelationField{Name: "to_user", Required: true, MaxSelect: 1, CollectionId: users.Id},
			&core.NumberField{Name: "amount_cents", Required: true, OnlyInt: true, Min: types.Pointer(1.0)},
			&core.DateField{Name: "date", Required: true},
			&core.TextField{Name: "note", Max: 1000},
			&core.RelationField{Name: "created_by", MaxSelect: 1, CollectionId: users.Id},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		settlements.AddIndex("idx_settlements_date", false, "date", "")
		if err := app.Save(settlements); err != nil {
			return err
		}

		// app settings: name, evening backups, login rate limits, DSM proxy
		settings := app.Settings()
		settings.Meta.AppName = "Splitwiz"
		settings.Backups.Cron = "0 20 * * *"
		settings.Backups.CronMaxKeep = 7
		settings.RateLimits.Enabled = true
		settings.TrustedProxy.Headers = []string{"X-Forwarded-For"}
		settings.TrustedProxy.UseLeftmostIP = false

		return app.Save(settings)
	}, func(app core.App) error {
		for _, name := range []string{"settlements", "expenses", "categories"} {
			c, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				continue
			}
			if err := app.Delete(c); err != nil {
				return err
			}
		}
		return nil
	})
}

func setMemberRules(c *core.Collection) {
	c.ListRule = types.Pointer(memberRule)
	c.ViewRule = types.Pointer(memberRule)
	c.CreateRule = types.Pointer(memberRule)
	c.UpdateRule = types.Pointer(memberRule)
	c.DeleteRule = types.Pointer(memberRule)
}
