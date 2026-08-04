import { Search } from "lucide-react";
import { DISTRICTS, DISTRICT_LABELS } from "@/types";

export function FilterBar({
  search,
  onSearchChange,
  district,
  onDistrictChange,
  searchPlaceholder = "Search...",
  showDistrictFilter = true,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  district: string;
  onDistrictChange: (value: string) => void;
  searchPlaceholder?: string;
  showDistrictFilter?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="w-full rounded-lg border border-primary-200 bg-white py-2.5 pl-10 pr-3.5 text-[15px] text-primary-900 placeholder:text-primary-400 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
      </div>
      {showDistrictFilter && (
        <select
          value={district}
          onChange={(e) => onDistrictChange(e.target.value)}
          aria-label="Filter by district"
          className="cursor-pointer rounded-lg border border-primary-200 bg-white px-3.5 py-2.5 text-[15px] text-primary-900 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 sm:w-56"
        >
          <option value="">All districts</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {DISTRICT_LABELS[d]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
