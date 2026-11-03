import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="2.75" width="6" height="6" rx="1" />
      <rect x="11.25" y="2.75" width="6" height="6" rx="1" />
      <rect x="2.75" y="11.25" width="6" height="6" rx="1" />
      <rect x="11.25" y="11.25" width="6" height="6" rx="1" />
    </Icon>
  );
}

export function TransactionsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 5.5h14M3 10h14M3 14.5h9" />
    </Icon>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 2.75v9.5" />
      <path d="M6.5 8.75 10 12.25l3.5-3.5" />
      <path d="M3.25 14.25v1.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
    </Icon>
  );
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.25 16.75h13.5" />
      <path d="M5.5 16.75v-5M9.25 16.75v-9M13 16.75v-6.5" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.25 6.5h13.5M3.25 13.5h13.5" />
      <circle cx="7.5" cy="6.5" r="1.75" />
      <circle cx="12.5" cy="13.5" r="1.75" />
    </Icon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 14 14 6M7.5 6H14v6.5" />
    </Icon>
  );
}

export function ArrowDownLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 6 6 14M12.5 14H6V7.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.75 4.75 13 10l-5.25 5.25" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.75 7.75 10 13l5.25-5.25" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.25 17 16.5H3L10 3.25Z" />
      <path d="M10 8v3.5M10 13.75v.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 3.75 3.75" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.25" y="8.75" width="11.5" height="8" rx="1.5" />
      <path d="M6.75 8.75V6.5a3.25 3.25 0 0 1 6.5 0v2.25" />
    </Icon>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.25 2.75h6.5l3 3v11.5h-9.5V2.75Z" />
      <path d="M11.75 2.75v3h3" />
    </Icon>
  );
}

export function CalculatorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="2.75" width="12" height="14.5" rx="1.5" />
      <path d="M7 6.5h6" />
      <path d="M7.5 10.5h.01M10 10.5h.01M12.5 10.5h.01" />
      <path d="M7.5 13.75h.01M10 13.75h.01M12.5 13.75h.01" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.75 5.5h12.5" />
      <path d="M7.25 5.5V4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1.5" />
      <path d="M5.5 5.5 6 16.25a.75.75 0 0 0 .75.75h6.5a.75.75 0 0 0 .75-.75L14.5 5.5" />
      <path d="M8.5 8.5v5M11.5 8.5v5" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 5 10 10M15 5 5 15" />
    </Icon>
  );
}
