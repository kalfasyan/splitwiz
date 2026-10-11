// Package ledger holds the money math: how an expense is split and what
// the running balance between the two users is. All amounts are integer
// cents so no rounding error can creep in.
package ledger

import (
	"errors"
	"sort"
)

// Split modes stored on an expense.
const (
	ModeEqual   = "equal"   // 50/50, the odd cent stays with the payer
	ModePercent = "percent" // payer carries PayerPercent of the amount
	ModeExact   = "exact"   // the other person owes OtherShareCents
	ModeFull    = "full"    // the other person owes the whole amount
)

var (
	ErrAmount      = errors.New("amount must be greater than zero")
	ErrMode        = errors.New("unknown split mode")
	ErrPercent     = errors.New("payer percent must be between 0 and 100")
	ErrOtherShare  = errors.New("other share must be between 0 and the amount")
	ErrNotTwoUsers = errors.New("the balance needs exactly two users")
)

// OwedCents returns how much the non-payer owes the payer for one expense.
// Rounding always favours the non-payer by at most one cent, so the payer
// absorbs the odd cent.
func OwedCents(amountCents int64, mode string, payerPercent float64, otherShareCents int64) (int64, error) {
	if amountCents <= 0 {
		return 0, ErrAmount
	}

	switch mode {
	case ModeEqual, "":
		return amountCents / 2, nil
	case ModePercent:
		if payerPercent < 0 || payerPercent > 100 {
			return 0, ErrPercent
		}
		// work in basis points to keep fractional percents (e.g. 33.33) exact enough
		bp := int64(payerPercent*100 + 0.5)
		return amountCents * (10000 - bp) / 10000, nil
	case ModeExact:
		if otherShareCents < 0 || otherShareCents > amountCents {
			return 0, ErrOtherShare
		}
		return otherShareCents, nil
	case ModeFull:
		return amountCents, nil
	}

	return 0, ErrMode
}

// Expense is the part of an expense the balance needs.
type Expense struct {
	PaidBy    string
	OwedCents int64
}

// Settlement is a payment from one user to the other.
type Settlement struct {
	From        string
	To          string
	AmountCents int64
}

// Balance says who owes whom. Debtor and Creditor are empty when settled.
type Balance struct {
	Debtor      string `json:"debtor"`
	Creditor    string `json:"creditor"`
	AmountCents int64  `json:"amount_cents"`
}

// Net returns each user's net position in cents: positive means the others
// owe them money, negative means they owe.
func Net(users []string, expenses []Expense, settlements []Settlement) (map[string]int64, error) {
	if len(users) != 2 {
		return nil, ErrNotTwoUsers
	}

	other := map[string]string{users[0]: users[1], users[1]: users[0]}
	net := map[string]int64{users[0]: 0, users[1]: 0}

	for _, e := range expenses {
		o, ok := other[e.PaidBy]
		if !ok {
			continue // expense paid by an unknown/deleted user
		}
		net[e.PaidBy] += e.OwedCents
		net[o] -= e.OwedCents
	}

	for _, s := range settlements {
		if _, ok := other[s.From]; !ok {
			continue
		}
		if _, ok := other[s.To]; !ok || s.From == s.To {
			continue
		}
		// paying off a debt moves the payer's position up
		net[s.From] += s.AmountCents
		net[s.To] -= s.AmountCents
	}

	return net, nil
}

// Summarize turns net positions into a single "debtor owes creditor" line.
func Summarize(net map[string]int64) Balance {
	ids := make([]string, 0, len(net))
	for id := range net {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	for _, id := range ids {
		if net[id] < 0 {
			for _, other := range ids {
				if other != id {
					return Balance{Debtor: id, Creditor: other, AmountCents: -net[id]}
				}
			}
		}
	}

	return Balance{}
}
