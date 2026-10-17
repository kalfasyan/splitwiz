package ledger

import (
	"testing"
	"time"
)

func TestNextDate(t *testing.T) {
	day := func(s string) time.Time {
		d, _ := time.Parse("2006-01-02", s)
		return d.Add(12 * time.Hour)
	}

	cases := []struct {
		from, every string
		anchor      int
		want        string
	}{
		{"2026-10-17", EveryWeek, 17, "2026-10-24"},
		{"2026-12-28", EveryWeek, 28, "2027-01-04"},
		{"2026-10-17", EveryMonth, 17, "2026-11-17"},
		{"2026-12-05", EveryMonth, 5, "2027-01-05"},
		{"2027-01-31", EveryMonth, 31, "2027-02-28"},
		{"2027-02-28", EveryMonth, 31, "2027-03-31"}, // back on the anchor day
		{"2028-01-31", EveryMonth, 31, "2028-02-29"}, // leap year
		{"2027-03-15", EveryYear, 15, "2028-03-15"},
		{"2028-02-29", EveryYear, 29, "2029-02-28"},
		{"2026-10-17", EveryMonth, 0, "2026-11-17"}, // missing anchor uses the date's day
	}
	for _, c := range cases {
		got, err := NextDate(day(c.from), c.every, c.anchor)
		if err != nil {
			t.Fatal(err)
		}
		if got.Format("2006-01-02") != c.want || got.Hour() != 12 {
			t.Errorf("NextDate(%s, %s, %d) = %s, want %s noon", c.from, c.every, c.anchor, got, c.want)
		}
	}

	if _, err := NextDate(day("2026-10-17"), "fortnight", 1); err != ErrEvery {
		t.Errorf("want ErrEvery, got %v", err)
	}
}
