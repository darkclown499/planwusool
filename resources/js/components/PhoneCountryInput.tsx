import { useMemo, useState, type ChangeEvent } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES } from '@/lib/countries';

interface PhoneCountryInputProps {
    id?: string;
    /** Full international number, e.g. +970599000000 */
    value: string;
    onChange: (value: string) => void;
}

/** Longest dial code that prefixes the value wins (e.g. +1 vs +1876). */
const detectCountry = (value: string) =>
    [...COUNTRIES].filter((c) => value.startsWith(c.dialCode)).sort((a, b) => b.dialCode.length - a.dialCode.length)[0] ??
    COUNTRIES[0];

export function PhoneCountryInput({ id, value, onChange }: PhoneCountryInputProps) {
    const [selectedCountry, setSelectedCountry] = useState(() => detectCountry(value));
    const [searchQuery, setSearchQuery] = useState('');
    const [open, setOpen] = useState(false);

    // Local digits = stored international number minus the selected dial code.
    const localValue = value.startsWith(selectedCountry.dialCode)
        ? value.slice(selectedCountry.dialCode.length)
        : '';

    const selectCountry = (code: string) => {
        const country = COUNTRIES.find((c) => c.code === code);
        if (!country) return;
        setSelectedCountry(country);
        onChange(country.dialCode + localValue.replace(/^0+/, ''));
        setSearchQuery('');
        setOpen(false);
    };

    const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/[^0-9]/g, '');
        onChange(selectedCountry.dialCode + digits);
    };

    const filteredCountries = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return COUNTRIES;
        return COUNTRIES.filter(
            (c) => c.name.includes(searchQuery.trim()) || c.nameEn.toLowerCase().includes(q) || c.dialCode.includes(q),
        );
    }, [searchQuery]);

    return (
        <div className="dir-ltr flex w-full items-center overflow-hidden rounded-xl border border-gray-200 bg-white transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
            {/* Country code picker */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label={selectedCountry.name}
                        className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 border-r border-gray-200 bg-gray-50 px-3 py-3 font-mono text-sm transition-colors hover:bg-gray-100"
                    >
                        <span className="text-lg leading-none">{selectedCountry.flag}</span>
                        <span className="font-medium text-gray-700">{selectedCountry.dialCode}</span>
                        <ChevronDown className="ml-0.5 h-4 w-4 text-gray-400" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" dir="rtl" className="z-50 w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                    {/* Search */}
                    <div className="relative mb-2">
                        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ابحث عن دولة أو رمز..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-gray-50 py-2 pl-3 pr-9 text-right text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Country list */}
                    <div className="scrollbar-custom max-h-56 space-y-0.5 overflow-y-auto">
                        {filteredCountries.length === 0 && (
                            <p className="py-6 text-center text-xs text-gray-400">لا توجد نتائج مطابقة</p>
                        )}
                        {filteredCountries.map((country) => (
                            <button
                                key={country.code}
                                type="button"
                                onClick={() => selectCountry(country.code)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-emerald-50 ${
                                    selectedCountry.code === country.code
                                        ? 'bg-emerald-50 font-semibold text-emerald-700'
                                        : 'text-gray-700'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-base">{country.flag}</span>
                                    <span>{country.name}</span>
                                </span>
                                <span className="dir-ltr font-mono text-gray-400">{country.dialCode}</span>
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Local number */}
            <input
                id={id}
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={localValue}
                onChange={handleNumberChange}
                placeholder="599 000 000"
                className="min-w-0 flex-1 border-none bg-transparent px-4 py-3 text-left font-mono text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
            />
        </div>
    );
}
