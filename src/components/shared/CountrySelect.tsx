import React from 'react';
import {
  AFRICAN_REGIONS,
  COUNTRIES_BY_REGION,
  cn,
} from '../../lib/utils';
import type { AfricanRegion } from '../../types/mariketi';

interface CountrySelectProps {
  label?: string;
  value: string;
  onChange: (countryName: string) => void;
  includeAllOption?: string;
  showDialCode?: boolean;
  regionFilter?: AfricanRegion | '';
  className?: string;
  selectClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  label,
  value,
  onChange,
  includeAllOption,
  showDialCode = false,
  regionFilter = '',
  className,
  selectClassName,
  ariaLabel,
  disabled = false,
}) => {
  const regionsToShow = regionFilter
    ? AFRICAN_REGIONS.filter((r) => r === regionFilter)
    : AFRICAN_REGIONS;

  const selectEl = (
    <select
      aria-label={ariaLabel || label || 'African country'}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full h-10 rounded-lg bg-white border border-[#D4DDE6] px-3 text-sm text-[#0F1B2A] shadow-[0_1px_2px_rgba(16,36,58,0.03)] transition-all duration-150 hover:border-[#B6C3D1] focus:outline-none focus:border-[#10243A] focus:ring-2 focus:ring-[#10243A]/12 disabled:bg-[#F3F6F9] disabled:text-[#526071]',
        selectClassName
      )}
    >
      {includeAllOption !== undefined && (
        <option value="">{includeAllOption}</option>
      )}
      {regionsToShow.map((region) => (
        <optgroup key={region} label={region}>
          {COUNTRIES_BY_REGION[region].map((country) => (
            <option key={country.code} value={country.name}>
              {country.flag} {country.name}
              {showDialCode ? ` (${country.dialCode})` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  if (!label) {
    return <div className={className}>{selectEl}</div>;
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-semibold text-[#10243A]">
        {label}
      </label>
      {selectEl}
    </div>
  );
};
