import { type ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">{children}</table>
    </div>
  );
}

export function TableHeader({ children, className = "" }: TableProps) {
  return <thead className={`bg-gray-50 ${className}`}>{children}</thead>;
}

export function TableBody({ children, className = "" }: TableProps) {
  return <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>{children}</tbody>;
}

export function TableRow({ children, className = "", onClick }: TableProps & { onClick?: () => void }) {
  return (
    <tr
      className={`${onClick ? "cursor-pointer hover:bg-gray-50" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  header?: boolean;
  align?: "left" | "center" | "right";
  title?: string;
}

export function TableCell({ children, className = "", header = false, align = "left", title }: TableCellProps) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  if (header) {
    return (
      <th
        className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignClass} ${className} ${title ? "cursor-help" : ""}`}
        title={title}
      >
        {children}
      </th>
    );
  }

  return (
    <td className={`px-4 py-3 text-sm text-gray-900 ${alignClass} ${className}`} title={title}>
      {children}
    </td>
  );
}
