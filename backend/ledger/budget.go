package ledger

import "math"

// DayAmount is money spent (or scheduled) on one day of a month, 1-based.
type DayAmount struct {
	Day   int
	Cents int64
	// added by a repeating series, so it isn't part of everyday spending
	Recurring bool
}

// Slope is the least-squares slope of ys over x = 0, 1, 2, ... (simple
// linear regression). Never negative: spending only goes up.
func Slope(ys []float64) float64 {
	n := float64(len(ys))
	if len(ys) < 2 {
		return 0
	}
	mx := (n - 1) / 2
	my := 0.0
	for _, y := range ys {
		my += y
	}
	my /= n
	num, den := 0.0, 0.0
	for x, y := range ys {
		num += (float64(x) - mx) * (y - my)
		den += (float64(x) - mx) * (float64(x) - mx)
	}
	return math.Max(0, num/den)
}

// ProjectMonth returns what was spent up to `today` and the projected total
// at the end of a month of `days` days. Same rule as monthOutlook in the web
// app (web/src/lib/budget.ts): everyday spending is continued along a
// straight line through its running total, and repeating charges still
// scheduled from today on are added as they are.
func ProjectMonth(days, today int, spent, scheduled []DayAmount) (spentCents, projectedCents int64) {
	everyday := make([]float64, today)
	for _, s := range spent {
		if s.Day < 1 || s.Day > today {
			continue
		}
		spentCents += s.Cents
		if !s.Recurring {
			everyday[s.Day-1] += float64(s.Cents)
		}
	}

	running := make([]float64, today+1)
	for i, c := range everyday {
		running[i+1] = running[i] + c
	}
	perDay := Slope(running)

	var extra int64
	for _, s := range scheduled {
		if s.Day >= today && s.Day <= days {
			extra += s.Cents
		}
	}
	return spentCents, int64(math.Round(float64(spentCents) + perDay*float64(days-today) + float64(extra)))
}
