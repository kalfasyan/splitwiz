package app

import (
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

// Expenses have a comment thread instead of a single note. A note sent with
// a new expense (from the form, a repeating series or an import) becomes
// its first comment.
func registerComments(app core.App) {
	app.OnRecordCreate("expenses").BindFunc(func(e *core.RecordEvent) error {
		note := strings.TrimSpace(e.Record.GetString("note"))
		e.Record.Set("note", "")
		if err := e.Next(); err != nil {
			return err
		}
		if note == "" {
			return nil
		}
		comments, err := e.App.FindCollectionByNameOrId("expense_comments")
		if err != nil {
			return err
		}
		c := core.NewRecord(comments)
		c.Set("expense", e.Record.Id)
		c.Set("author", firstNonEmpty(e.Record.GetString("created_by"), e.Record.GetString("paid_by")))
		c.Set("text", note)
		return e.App.Save(c)
	})

	app.OnRecordCreateRequest("expense_comments").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth != nil {
			e.Record.Set("author", e.Auth.Id)
		}
		e.Record.Set("text", strings.TrimSpace(e.Record.GetString("text")))
		if err := e.Next(); err != nil {
			return err
		}
		expense, err := e.App.FindRecordById("expenses", e.Record.GetString("expense"))
		if err != nil || e.Auth == nil {
			return nil
		}
		notifyOthers(e.App, e.Auth.Id, func(string) notification {
			return notification{
				Title: displayName(e.Auth) + " on " + expense.GetString("description"),
				Body:  e.Record.GetString("text"),
				URL:   expenseURL(expense.Id),
				Tag:   "comment-" + expense.Id,
			}
		})
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
