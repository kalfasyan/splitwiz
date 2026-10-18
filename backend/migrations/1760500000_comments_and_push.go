package migrations

import (
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Adds comments on expenses (existing notes become the first comment), the
// phones that get push notifications, and a marker so the budget alert is
// sent once a month.
func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		expenses, err := app.FindCollectionByNameOrId("expenses")
		if err != nil {
			return err
		}

		comments := core.NewBaseCollection("expense_comments")
		setMemberRules(comments)
		// comments can't be edited, and only their author can delete them
		comments.UpdateRule = nil
		comments.DeleteRule = types.Pointer(memberRule + " && author = @request.auth.id")
		comments.Fields.Add(
			&core.RelationField{Name: "expense", Required: true, MaxSelect: 1, CollectionId: expenses.Id, CascadeDelete: true},
			// set by the server to whoever is signed in, see comments.go
			&core.RelationField{Name: "author", MaxSelect: 1, CollectionId: users.Id},
			&core.TextField{Name: "text", Required: true, Max: 1000},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		comments.AddIndex("idx_expense_comments_expense", false, "expense", "")
		if err := app.Save(comments); err != nil {
			return err
		}

		// only reachable through /api/splitwiz/push, see push.go
		subs := core.NewBaseCollection("push_subscriptions")
		subs.Fields.Add(
			&core.RelationField{Name: "user", Required: true, MaxSelect: 1, CollectionId: users.Id, CascadeDelete: true},
			&core.TextField{Name: "endpoint", Required: true, Max: 2000},
			&core.TextField{Name: "p256dh", Required: true, Max: 200},
			&core.TextField{Name: "auth", Required: true, Max: 200},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		subs.AddIndex("idx_push_subscriptions_endpoint", true, "endpoint", "")
		if err := app.Save(subs); err != nil {
			return err
		}

		budget, err := app.FindCollectionByNameOrId("budget")
		if err != nil {
			return err
		}
		// YYYY-MM of the last "heading over budget" alert
		budget.Fields.Add(&core.TextField{Name: "alerted_month", Max: 7, Hidden: true})
		if err := app.Save(budget); err != nil {
			return err
		}

		withNotes, err := app.FindRecordsByFilter("expenses", "note != ''", "", 0, 0)
		if err != nil {
			return err
		}
		for _, e := range withNotes {
			c := core.NewRecord(comments)
			c.Set("expense", e.Id)
			c.Set("author", firstNonEmpty(e.GetString("created_by"), e.GetString("paid_by")))
			c.Set("text", strings.TrimSpace(e.GetString("note")))
			if err := app.Save(c); err != nil {
				return err
			}
			e.Set("note", "")
			if err := app.Save(e); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		for _, name := range []string{"expense_comments", "push_subscriptions"} {
			if c, err := app.FindCollectionByNameOrId(name); err == nil {
				if err := app.Delete(c); err != nil {
					return err
				}
			}
		}
		if c, err := app.FindCollectionByNameOrId("budget"); err == nil {
			c.Fields.RemoveByName("alerted_month")
			return app.Save(c)
		}
		return nil
	})
}

func firstNonEmpty(s ...string) string {
	for _, v := range s {
		if v != "" {
			return v
		}
	}
	return ""
}
