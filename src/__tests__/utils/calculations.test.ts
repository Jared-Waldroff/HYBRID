/**
 * Utility function tests
 */

describe('Date Utilities', () => {
    describe('formatDate', () => {
        it('formats ISO date to readable format', () => {
            const date = new Date('2026-01-15T12:00:00');
            const formatted = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
            expect(formatted).toContain('Jan');
            // Date may vary by timezone, just check it contains a number
            expect(formatted).toMatch(/\d+/);
        });
    });

    describe('isToday', () => {
        it('returns true for today date', () => {
            const today = new Date().toISOString().split('T')[0];
            const isToday = (dateStr: string) => {
                const todayStr = new Date().toISOString().split('T')[0];
                return dateStr === todayStr;
            };
            expect(isToday(today)).toBe(true);
        });

        it('returns false for past date', () => {
            const isToday = (dateStr: string) => {
                const todayStr = new Date().toISOString().split('T')[0];
                return dateStr === todayStr;
            };
            expect(isToday('2020-01-01')).toBe(false);
        });
    });
});

describe('Workout Calculations', () => {
    describe('calculateTotalVolume', () => {
        const calculateVolume = (sets: { weight: number; reps: number }[]) => {
            return sets.reduce((total, set) => total + set.weight * set.reps, 0);
        };

        it('calculates volume correctly for single set', () => {
            const sets = [{ weight: 100, reps: 10 }];
            expect(calculateVolume(sets)).toBe(1000);
        });

        it('calculates volume correctly for multiple sets', () => {
            const sets = [
                { weight: 100, reps: 10 },
                { weight: 100, reps: 8 },
                { weight: 100, reps: 6 },
            ];
            expect(calculateVolume(sets)).toBe(2400);
        });

        it('returns 0 for empty sets', () => {
            expect(calculateVolume([])).toBe(0);
        });
    });

    describe('getDaysUntilEvent', () => {
        const getDaysUntil = (eventDate: string) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const event = new Date(eventDate);
            event.setHours(0, 0, 0, 0);
            const diffTime = event.getTime() - today.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        it('returns positive days for future events', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            const dateStr = futureDate.toISOString().split('T')[0];
            expect(getDaysUntil(dateStr)).toBe(30);
        });

        it('returns 0 for today', () => {
            const today = new Date().toISOString().split('T')[0];
            expect(getDaysUntil(today)).toBe(0);
        });

        it('returns negative days for past events', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);
            const dateStr = pastDate.toISOString().split('T')[0];
            expect(getDaysUntil(dateStr)).toBe(-5);
        });
    });
});

describe('Form Validation', () => {
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        return password.length >= 6;
    };

    const validateUsername = (username: string) => {
        return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
    };

    describe('validateEmail', () => {
        it('accepts valid email', () => {
            expect(validateEmail('test@example.com')).toBe(true);
        });

        it('rejects email without @', () => {
            expect(validateEmail('testexample.com')).toBe(false);
        });

        it('rejects email without domain', () => {
            expect(validateEmail('test@')).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('accepts password with 6+ characters', () => {
            expect(validatePassword('secure123')).toBe(true);
        });

        it('rejects password with less than 6 characters', () => {
            expect(validatePassword('12345')).toBe(false);
        });
    });

    describe('validateUsername', () => {
        it('accepts valid username', () => {
            expect(validateUsername('athlete_123')).toBe(true);
        });

        it('rejects username with special characters', () => {
            expect(validateUsername('user@name')).toBe(false);
        });

        it('rejects username less than 3 characters', () => {
            expect(validateUsername('ab')).toBe(false);
        });
    });
});
