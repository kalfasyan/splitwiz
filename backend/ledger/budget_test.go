package ledger

import (
	"math"
	"testing"
)

func TestSlope(t *testing.T) {
	cases := []struct {
		ys   []float64
		want float64
	}{
		{[]float64{0, 10, 20, 30}, 10},
		{[]float64{0, 0, 30}, 15},
		{[]float64{5}, 0},
		{[]float64{30, 20, 10}, 0},
	}
	for _, c := range cases {
		if got := Slope(c.ys); math.Abs(got-c.want) > 1e-9 {
			t.Errorf("Slope(%v) = %v, want %v", c.ys, got, c.want)
		}
	}
}

// the same cases as monthOutlook in web/src/lib/budget.test.ts
func TestProjectMonth(t *testing.T) {
	var tenADay []DayAmount
	for d := 1; d <= 10; d++ {
		tenADay = append(tenADay, DayAmount{Day: d, Cents: 1000})
	}
	cases := []struct {
		name                 string
		days, today          int
		spent, scheduled     []DayAmount
		wantSpent, wantTotal int64
	}{
		{"everyday trend plus rent still to come", 30, 10,
			append(tenADay, DayAmount{Day: 12, Cents: 99999}), []DayAmount{{Day: 25, Cents: 90000}},
			10000, 30000 + 90000},
		{"repeating charges already added stay out of the trend", 30, 2,
			[]DayAmount{{Day: 1, Cents: 90000, Recurring: true}, {Day: 2, Cents: 2000}}, nil,
			92000, 92000 + 28*1000},
		{"a charge due today that is not added yet counts", 30, 10,
			nil, []DayAmount{{Day: 10, Cents: 90000}},
			0, 90000},
	}
	for _, c := range cases {
		spent, total := ProjectMonth(c.days, c.today, c.spent, c.scheduled)
		if spent != c.wantSpent || total != c.wantTotal {
			t.Errorf("%s: got %d, %d; want %d, %d", c.name, spent, total, c.wantSpent, c.wantTotal)
		}
	}
}
