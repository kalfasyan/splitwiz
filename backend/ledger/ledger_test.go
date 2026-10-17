package ledger

import "testing"

func TestOwedCents(t *testing.T) {
	cases := []struct {
		name    string
		amount  int64
		mode    string
		percent float64
		other   int64
		want    int64
		wantErr error
	}{
		{"equal even", 1000, ModeEqual, 0, 0, 500, nil},
		{"equal odd cent stays with payer", 1001, ModeEqual, 0, 0, 500, nil},
		{"empty mode is equal", 300, "", 0, 0, 150, nil},
		{"percent 60/40", 10000, ModePercent, 60, 0, 4000, nil},
		{"percent rounds toward payer", 1001, ModePercent, 60, 0, 400, nil},
		{"percent fractional", 10000, ModePercent, 33.33, 0, 6667, nil},
		{"percent payer pays all", 500, ModePercent, 100, 0, 0, nil},
		{"percent other pays all", 500, ModePercent, 0, 0, 500, nil},
		{"exact", 2500, ModeExact, 0, 700, 700, nil},
		{"full", 2500, ModeFull, 0, 0, 2500, nil},
		{"zero amount", 0, ModeEqual, 0, 0, 0, ErrAmount},
		{"negative amount", -5, ModeEqual, 0, 0, 0, ErrAmount},
		{"bad percent", 100, ModePercent, 101, 0, 0, ErrPercent},
		{"exact above amount", 100, ModeExact, 0, 101, 0, ErrOtherShare},
		{"exact negative", 100, ModeExact, 0, -1, 0, ErrOtherShare},
		{"unknown mode", 100, "thirds", 0, 0, 0, ErrMode},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := OwedCents(c.amount, c.mode, c.percent, c.other)
			if err != c.wantErr {
				t.Fatalf("err = %v, want %v", err, c.wantErr)
			}
			if got != c.want {
				t.Fatalf("owed = %d, want %d", got, c.want)
			}
		})
	}
}

func TestNetAndSummarize(t *testing.T) {
	users := []string{"alex", "sam"}

	expenses := []Expense{
		{PaidBy: "alex", OwedCents: 5000},  // groceries 100.00, 50/50
		{PaidBy: "sam", OwedCents: 1200},   // dinner, partner paid
		{PaidBy: "ghost", OwedCents: 9999}, // ignored
	}
	settlements := []Settlement{
		{From: "sam", To: "alex", AmountCents: 1000},
	}

	net, err := Net(users, expenses, settlements)
	if err != nil {
		t.Fatal(err)
	}
	if net["alex"] != 2800 || net["sam"] != -2800 {
		t.Fatalf("net = %v", net)
	}

	b := Summarize(net)
	if b.Debtor != "sam" || b.Creditor != "alex" || b.AmountCents != 2800 {
		t.Fatalf("balance = %+v", b)
	}
}

func TestSettledUp(t *testing.T) {
	users := []string{"a", "b"}
	net, err := Net(users,
		[]Expense{{PaidBy: "a", OwedCents: 750}},
		[]Settlement{{From: "b", To: "a", AmountCents: 750}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if b := Summarize(net); b != (Balance{}) {
		t.Fatalf("expected settled, got %+v", b)
	}
}

func TestNetNeedsTwoUsers(t *testing.T) {
	if _, err := Net([]string{"solo"}, nil, nil); err != ErrNotTwoUsers {
		t.Fatalf("err = %v", err)
	}
}
