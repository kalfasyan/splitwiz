package ledger

import (
	"errors"
	"time"
)

// How often a recurring expense repeats.
const (
	EveryWeek  = "week"
	EveryMonth = "month"
	EveryYear  = "year"
)

var ErrEvery = errors.New("repeat must be week, month or year")

// NextDate returns the occurrence after `from`. Monthly and yearly repeats
// stay on anchorDay (the day of the month the series started on), falling
// back to the month's last day when it is shorter: a series started on the
// 31st runs Jan 31, Feb 28, Mar 31.
func NextDate(from time.Time, every string, anchorDay int) (time.Time, error) {
	if anchorDay < 1 || anchorDay > 31 {
		anchorDay = from.Day()
	}

	switch every {
	case EveryWeek:
		return from.AddDate(0, 0, 7), nil
	case EveryMonth:
		return onDay(from.Year(), from.Month()+1, anchorDay, from), nil
	case EveryYear:
		return onDay(from.Year()+1, from.Month(), anchorDay, from), nil
	}
	return time.Time{}, ErrEvery
}

func onDay(year int, month time.Month, day int, like time.Time) time.Time {
	// normalise month overflow (13 -> January next year) first
	first := time.Date(year, month, 1, like.Hour(), like.Minute(), like.Second(), 0, like.Location())
	last := first.AddDate(0, 1, -1).Day()
	if day > last {
		day = last
	}
	return first.AddDate(0, 0, day-1)
}
